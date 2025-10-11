
import { useState, useEffect, useRef } from 'react';
import { WebR, RObject } from 'webr';
import type { ConsoleOutput, Environment, TableData, PlotData } from '../types';

let webR: WebR;
let plotIdCounter = 0;

/***
 * Converts a data frame-like object from WebR's .toJs() format
 * into a structured format suitable for table display.
 */
function rObjectToTable(jsObject: any): { data: Record<string, any>[]; columns: string[] } | null {
  if (typeof jsObject !== 'object' || jsObject === null || jsObject.type !== 'list' || !Array.isArray(jsObject.names) || !Array.isArray(jsObject.values)) {
    console.error("Data is not in the expected R list format for a data frame.", jsObject);
    return null;
  }
  
  const columns = jsObject.names as string[];
  const data: Record<string, any>[] = [];

  if (columns.length === 0 || !Array.isArray(jsObject.values) || jsObject.values.length === 0) {
    return { data, columns };
  }
  
  const nRows = jsObject.values[0]?.values?.length || 0;
  if (nRows === 0) {
      return { data, columns };
  }
  
  for (let i = 0; i < nRows; i++) {
    const row: Record<string, any> = {};
    for (let j = 0; j < columns.length; j++) {
      const colName = columns[j];
      const colData = jsObject.values[j];
      if (colName && colData?.values && i < colData.values.length) {
        row[colName] = colData.values[i];
      } else {
        row[colName] = null;
      }
    }
    data.push(row);
  }
  return { data, columns };
}


export function useWebR() {
  const [isLoading, setIsLoading] = useState(true);
  const [consoleOutput, setConsoleOutput] = useState<ConsoleOutput[]>([]);
  const [environment, setEnvironment] = useState<Environment>({});
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [plots, setPlots] = useState<PlotData[]>([]);
  const [packages, setPackages] = useState<Record<string, string>>({});
  const [viewableDataFrames, setViewableDataFrames] = useState<Record<string, { data: Record<string, any>[], columns: string[] }>>({});


  const shelter = useRef<any>(null);
  const webRReaders = useRef<{
    stdout?: ReadableStreamDefaultReader<string>;
    stderr?: ReadableStreamDefaultReader<string>;
  }>({});

  useEffect(() => {
    async function initializeWebR() {
      if (webR) {
        setIsLoading(false);
        return;
      }
      
      try {
        webR = new WebR();

        setIsLoading(true);
        setConsoleOutput([{ type: 'system', message: 'Initializing WebR...' }]);
        
        await webR.init();
        shelter.current = await new webR.Shelter();

        setConsoleOutput(prev => [...prev, { type: 'system', message: 'Setting up communication channels...' }]);
        
        await webR.evalRVoid('webr::shim_install()');
        
        const handleStream = async (
          stream: ReadableStream<string> | undefined,
          type: 'stdout' | 'stderr'
        ) => {
          if (!stream) {
            console.warn(`${type} stream is not available`);
            return;
          }
          
          const reader = stream.getReader();
          webRReaders.current[type] = reader;
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              setConsoleOutput(prev => [...prev, { type, message: value }]);
            }
          } catch (e) {
            if ((e as Error).name !== 'AbortError') {
              console.error(`Error reading ${type} stream:`, e);
            }
          }
        };

        const webRAny = webR as any;
        if (webRAny.stdout) {
          handleStream(webRAny.stdout, 'stdout');
        }
        if (webRAny.stderr) {
          handleStream(webRAny.stderr, 'stderr');
        }

        await webR.evalRVoid('webr::canvas(width = 600, height = 500)');

        if (webRAny.channel) {
          webRAny.channel.onmessage = async (msg: any) => {
            if (msg.type === 'view') {
              await handleViewCallback(msg.data.data, msg.data.title);
            }
          };
        } else {
          console.warn('WebR channel is not available');
        }

        setIsLoading(false);
        setConsoleOutput(prev => [...prev, { type: 'system', message: 'WebR Initialized. Ready to execute R code.' }]);
        await updateEnvironment();
      } catch (error) {
        console.error('Error initializing WebR:', error);
        setConsoleOutput(prev => [...prev, { 
          type: 'stderr', 
          message: `Failed to initialize WebR: ${(error as Error).message}` 
        }]);
        setIsLoading(false);
      }
    }
    
    initializeWebR();

    return () => {
      webRReaders.current.stdout?.cancel().catch(() => {});
      webRReaders.current.stderr?.cancel().catch(() => {});
      if (shelter.current) {
        shelter.current.purge();
      }
      if (webR) {
        const webRAny = webR as any;
        if (webRAny.channel) {
          webRAny.channel.onmessage = null;
        }
      }
    };
  }, []);

  const handleViewCallback = async (dataRObj: RObject, name: string) => {
    try {
      const dataObj = await dataRObj.toJs();
      const table = rObjectToTable(dataObj);

      if (table) {
        console.log(`Content for data.frame '${name}' from View():`, table.data);
        setTableData({ name, ...table });
        setViewableDataFrames(prev => ({ ...prev, [name]: table }));
      }
    } catch (error) {
      console.error('Error in handleViewCallback:', error);
    } finally {
      (dataRObj as any)?.destroy();
    }
  };

  const updateEnvironment = async () => {
    if (!webR || !webR.evalR) return;
    let result: RObject | null = null;
    try {
      const rCode = `
        list(
          env = {
            env_details <- lapply(ls(envir = .GlobalEnv), function(x) {
              obj <- get(x, envir = .GlobalEnv)
              obj_info <- list()
              obj_info$class <- class(obj)
              
              if (is.function(obj)) {
                obj_info$objectType <- "function"
                args <- names(formals(obj))
                args_str <- paste(args, collapse = ", ")
                obj_info$str <- paste0("function(", args_str, ")")
              } else {
                obj_info$objectType <- "variable"
                obj_info$str <- capture.output(str(obj, max.level = 0, give.attr = FALSE, vec.len = 1))[1]
              }
              obj_info
            })
            names(env_details) <- ls(envir = .GlobalEnv)
            env_details
          },
          packages = {
            pkg_names <- .packages()
            pkg_versions <- sapply(pkg_names, function(p) as.character(packageVersion(p)), USE.NAMES = FALSE)
            names(pkg_versions) <- pkg_names
            as.list(pkg_versions)
          },
          dataframes = {
            df_names <- Filter(function(x) is.data.frame(get(x, envir = .GlobalEnv)), ls(envir = .GlobalEnv))
            df_list <- lapply(df_names, function(x) get(x, envir = .GlobalEnv))
            names(df_list) <- df_names
            df_list
          }
        )
      `;
      result = await webR.evalR(rCode);
      const resultJs = await result.toJs();

      console.log("Full environment and data frames from R:", resultJs);
      
      if (typeof resultJs !== 'object' || resultJs === null || resultJs.type !== 'list' || !Array.isArray(resultJs.names) || !Array.isArray(resultJs.values)) {
          console.error("Unexpected structure from updateEnvironment R script");
          return;
      }
      
      const envIndex = resultJs.names.indexOf('env');
      if (envIndex !== -1) {
          const envJs = resultJs.values[envIndex];
          const newEnv: Environment = {};
          
          if (typeof envJs === 'object' && envJs !== null && 'type' in envJs && envJs.type === 'list' && 'names' in envJs && Array.isArray(envJs.names) && 'values' in envJs && Array.isArray(envJs.values)) {
            for (let i = 0; i < envJs.names.length; i++) {
              const name = envJs.names[i];
              const details = envJs.values[i];
              if (typeof name === 'string' && name && typeof details === 'object' && details !== null && 'type' in details && details.type === 'list' && 'names' in details && Array.isArray(details.names) && 'values' in details && Array.isArray(details.values)) {
                
                const objectType = details.values[details.names.indexOf('objectType')];
                const class_ = details.values[details.names.indexOf('class')];
                const str = details.values[details.names.indexOf('str')];

                if (
                    objectType && typeof objectType === 'object' && 'values' in objectType && Array.isArray(objectType.values) &&
                    class_ && typeof class_ === 'object' && 'values' in class_ && Array.isArray(class_.values) &&
                    str && typeof str === 'object' && 'values' in str && Array.isArray(str.values)
                ) {
                  newEnv[name] = {
                      objectType: (objectType.values[0] as 'function' | 'variable'),
                      class: class_.values as string[],
                      str: (str.values as string[]).join(' ')
                  };
                }
              }
            }
          }
          setEnvironment(newEnv);
      }

      const packagesIndex = resultJs.names.indexOf('packages');
      if (packagesIndex !== -1) {
          const packagesJs = resultJs.values[packagesIndex];
          if (packagesJs && typeof packagesJs === 'object' && 'type' in packagesJs && packagesJs.type === 'list' && 'names' in packagesJs && Array.isArray(packagesJs.names) && 'values' in packagesJs && Array.isArray(packagesJs.values)) {
              const newPackages: Record<string, string> = {};
               for (let i = 0; i < packagesJs.names.length; i++) {
                const name = packagesJs.names[i];
                const versionData = packagesJs.values[i];
                if (typeof name === 'string' && name && versionData && typeof versionData === 'object' && 'values'in versionData && Array.isArray(versionData.values)) {
                    const version = versionData.values[0];
                    if(typeof version === 'string') {
                        newPackages[name] = version;
                    }
                }
              }
              setPackages(newPackages);
          }
      }

      const dataframesIndex = resultJs.names.indexOf('dataframes');
      if (dataframesIndex !== -1) {
        const dfsJs = resultJs.values[dataframesIndex];
        const newViewableDataFrames: Record<string, { data: Record<string, any>[], columns: string[] }> = {};
        // FIX: Add robust type guards to ensure dfsJs is an object with the expected properties before access.
        if (dfsJs && typeof dfsJs === 'object' && 'type' in dfsJs && dfsJs.type === 'list' && 'names' in dfsJs && Array.isArray(dfsJs.names) && 'values' in dfsJs && Array.isArray(dfsJs.values)) {
          for (let i = 0; i < dfsJs.names.length; i++) {
            const name = dfsJs.names[i];
            const dfData = dfsJs.values[i];
            const table = rObjectToTable(dfData);
            if (table && typeof name === 'string') {
              newViewableDataFrames[name] = table;
            }
          }
        }
        setViewableDataFrames(newViewableDataFrames);
      }
    } catch (error) {
      console.error('Error updating environment:', error);
    } finally {
      if (result && typeof (result as any).destroy === 'function') {
        (result as any).destroy();
      }
    }
  };

  const runCode = async (code: string) => {
    if (!webR || isLoading || !shelter.current) return;
    setConsoleOutput(prev => [...prev, { type: 'input', message: code }]);
    
    const codeToExecute = `
      res <- withVisible({
        ${code}
      });
      if (res$visible) {
        print(res$value);
      }
    `;

    try {
      const captureResult = await shelter.current.captureR(codeToExecute, {
        withImages: true,
      });
      console.log("Raw output from R execution:", captureResult);
      
      let stdoutMessages = '';
      let stderrMessages = '';

      captureResult.output.forEach((msg: { type: 'stdout' | 'stderr', data: string }) => {
        if (msg.type === 'stdout') {
            stdoutMessages += msg.data + '\n';
        } else if (msg.type === 'stderr') {
            stderrMessages += msg.data + '\n';
        }
      });
      
      stdoutMessages = stdoutMessages.trimEnd();
      stderrMessages = stderrMessages.trimEnd();

      if (stdoutMessages) {
        setConsoleOutput(prev => [...prev, { type: 'stdout', message: stdoutMessages }]);
      }
      if (stderrMessages) {
        setConsoleOutput(prev => [...prev, { type: 'stderr', message: stderrMessages }]);
      }
      
      if (captureResult.images.length > 0) {
        const newPlots: PlotData[] = [];
        for (const image of captureResult.images) {
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(image, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            newPlots.push({ id: `plot-${plotIdCounter++}`, dataUrl });
          }
          image.close();
        }
        setPlots(prev => [...prev, ...newPlots]);
      }
    } catch (e: any) {
      setConsoleOutput(prev => [...prev, { type: 'stderr', message: e.message }]);
    } finally {
      await updateEnvironment();
    }
  };

  const viewObjectByName = (name: string) => {
    if (!/^[a-zA-Z0-9_.]+$/.test(name)) {
      const errorMsg = `Error: Invalid object name for View(): ${name}`;
      console.error(errorMsg);
      setConsoleOutput(prev => [...prev, { type: 'stderr', message: errorMsg }]);
      return;
    }

    if (viewableDataFrames[name]) {
      setTableData({ name, ...viewableDataFrames[name] });
    } else {
      const errorMsg = `Data for object '${name}' not found. It might not be a data.frame or is not in the global environment.`;
      console.error(errorMsg);
      setConsoleOutput(prev => [...prev, { type: 'stderr', message: errorMsg }]);
    }
  };

  const clearPlots = () => setPlots([]);
  const clearTable = () => setTableData(null);
  const clearConsole = () => setConsoleOutput([]);

  return { isLoading, consoleOutput, environment, tableData, plots, packages, runCode, clearPlots, clearTable, clearConsole, viewObjectByName };
}
