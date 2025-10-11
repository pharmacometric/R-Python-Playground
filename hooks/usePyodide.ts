
import { useState, useEffect, useRef } from 'react';
import type { ConsoleOutput, PythonEnvironment, TableData, PlotData } from '../types';

let pyodide: any;
let plotIdCounter = 0;

export function usePyodide() {
  const [isLoading, setIsLoading] = useState(true);
  const [isEnvLoading, setIsEnvLoading] = useState(true);
  const [consoleOutput, setConsoleOutput] = useState<ConsoleOutput[]>([]);
  const [environment, setEnvironment] = useState<PythonEnvironment>({});
  const [tableData, setTableData] = useState<TableData | null>(null);
  const [plots, setPlots] = useState<PlotData[]>([]);

  useEffect(() => {
    async function initializePyodide() {
      if (pyodide) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setConsoleOutput([{ type: 'system', message: 'Initializing Pyodide...' }]);
        
        pyodide = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/"
        });
        
        pyodide.setStdout({
            batched: (msg: string) => {
                if(msg) setConsoleOutput(prev => [...prev, { type: 'stdout', message: msg }]);
            }
        });
        pyodide.setStderr({
            batched: (msg: string) => {
                if(msg) setConsoleOutput(prev => [...prev, { type: 'stderr', message: msg }]);
            }
        });

        setConsoleOutput(prev => [...prev, { type: 'system', message: 'Loading packages...' }]);
        await pyodide.loadPackage(['pandas', 'matplotlib']);

        setIsLoading(false);
        setConsoleOutput(prev => [...prev, { type: 'system', message: 'Pyodide Initialized. Ready to execute Python code.' }]);
        await updateEnvironment();
      } catch (error) {
        console.error('Error initializing Pyodide:', error);
        setConsoleOutput(prev => [...prev, { 
          type: 'stderr', 
          message: `Failed to initialize Pyodide: ${(error as Error).message}` 
        }]);
        setIsLoading(false);
      }
    }
    
    initializePyodide();

  }, []);

  const updateEnvironment = async () => {
    if (!pyodide) return;
    setIsEnvLoading(true);
    try {
      const code = `
import json
import pandas as pd
import sys
import matplotlib.pyplot as plt
from matplotlib.figure import Figure

_vars = {}
_builtins = set(dir(__builtins__))
_scope = globals()

# Filter out modules and built-ins
_vars_to_ignore = {
    '__name__', '__doc__', '__package__', '__loader__', '__spec__', '__annotations__',
    '__builtins__', '_vars', '_builtins', '_scope', '_vars_to_ignore', 'json', 'pd', 
    'sys', 'pyodide', 'plt', 'Figure'
}
_vars_to_ignore.update(_builtins)

for name, value in _scope.items():
    if name not in _vars_to_ignore and not name.startswith('_') and type(value).__name__ != 'module':
        try:
            repr_val = repr(value)
        except Exception:
            repr_val = f"<{type(value).__name__}>"

        if len(repr_val) > 100:
            repr_val = repr_val[:100] + '...'

        _vars[name] = {
            'type': type(value).__name__,
            'repr': repr_val,
            'is_dataframe': isinstance(value, pd.DataFrame),
            'is_figure': isinstance(value, Figure),
        }
json.dumps(_vars)
      `;
      const envJson = await pyodide.runPythonAsync(code);
      setEnvironment(JSON.parse(envJson));
    } catch (error) {
        console.error('Error updating Python environment:', error);
    } finally {
        setIsEnvLoading(false);
    }
  };

  const runCode = async (code: string, options?: { isInteractive?: boolean }) => {
    if (!pyodide || isLoading) return;
    setConsoleOutput(prev => [...prev, { type: 'input', message: code }]);
    
    const isInteractive = options?.isInteractive ?? false;

    try {
        if (!isInteractive) {
            await pyodide.runPythonAsync(`
import matplotlib.pyplot as plt
# Reset plot state for new script execution
plt.close('all')
`);
        }
        await pyodide.runPythonAsync(code);

        const plotsCode = `
import io
import base64
import matplotlib.pyplot as plt
import json

plots = []
for i in plt.get_fignums():
    fig = plt.figure(i)
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    plots.append(base64.b64encode(buf.read()).decode('utf-8'))

json.dumps(plots)
`;
        const plotsJson = await pyodide.runPythonAsync(plotsCode);
        const newPlots = JSON.parse(plotsJson);
        
        const plotObjects = newPlots.map((p: string) => ({
            id: `plot-${plotIdCounter++}`,
            dataUrl: `data:image/png;base64,${p}`
        }));

        if (isInteractive) {
            // For interactive console, replace plots with the current state of all figures
            setPlots(plotObjects);
        } else {
            // For editor script runs, append new plots
            if (plotObjects.length > 0) {
                setPlots(prev => [...prev, ...plotObjects]);
            }
        }
    } catch (e: any) {
      // The error will be printed by the pyodide.setStderr handler
    } finally {
      await updateEnvironment();
    }
  };

  const viewObjectByName = async (name: string) => {
    if (!pyodide || !/^[a-zA-Z0-9_]+$/.test(name)) {
      const errorMsg = `Error: Invalid object name for viewer: ${name}`;
      console.error(errorMsg);
      setConsoleOutput(prev => [...prev, { type: 'stderr', message: errorMsg }]);
      return;
    }
    
    try {
        const jsonCode = `
import json
if "${name}" in globals() and hasattr(globals()["${name}"], 'to_json'):
    globals()["${name}"].to_json(orient='split')
else:
    None
`;
        const tableJson = await pyodide.runPythonAsync(jsonCode);

        if (tableJson) {
            const parsed = JSON.parse(tableJson);
            const table = {
                columns: parsed.columns,
                data: parsed.data.map((row: any[], i: number) => {
                    const rowObj: Record<string, any> = { '#': parsed.index[i] };
                    parsed.columns.forEach((col: string, j: number) => {
                        rowObj[col] = row[j];
                    });
                    return rowObj;
                })
            };
            setTableData({ name, columns: ['#', ...table.columns], data: table.data });
        } else {
            throw new Error(`Object '${name}' is not a DataFrame or does not exist.`);
        }
    } catch (error) {
        const errorMsg = `Could not view object '${name}': ${(error as Error).message}`;
        console.error(errorMsg);
        setConsoleOutput(prev => [...prev, { type: 'stderr', message: errorMsg }]);
    }
  };

  const viewPlotByName = async (name: string) => {
    if (!pyodide || !/^[a-zA-Z0-9_]+$/.test(name)) {
      const errorMsg = `Error: Invalid object name for viewer: ${name}`;
      console.error(errorMsg);
      setConsoleOutput(prev => [...prev, { type: 'stderr', message: errorMsg }]);
      return;
    }

    try {
        const pythonCode = `
import io
import base64
from matplotlib.figure import Figure

plot_b64 = None
if "${name}" in globals() and isinstance(globals()["${name}"], Figure):
    fig = globals()["${name}"]
    buf = io.BytesIO()
    fig.savefig(buf, format='png', bbox_inches='tight')
    buf.seek(0)
    plot_b64 = base64.b64encode(buf.read()).decode('utf-8')
plot_b64
`;
        const b64string = await pyodide.runPythonAsync(pythonCode);
        if (b64string) {
            const newPlot = {
                id: `plot-${plotIdCounter++}`,
                dataUrl: `data:image/png;base64,${b64string}`
            };
            setPlots(prev => [...prev, newPlot]);
        } else {
             throw new Error(`Object '${name}' is not a Figure or does not exist.`);
        }
    } catch (error) {
        const errorMsg = `Could not view plot object '${name}': ${(error as Error).message}`;
        console.error(errorMsg);
        setConsoleOutput(prev => [...prev, { type: 'stderr', message: errorMsg }]);
    }
  };

  const clearPlots = () => setPlots([]);
  const clearTable = () => setTableData(null);
  const clearConsole = () => setConsoleOutput([]);

  return { isLoading, isEnvLoading, consoleOutput, environment, tableData, plots, runCode, clearPlots, clearTable, clearConsole, viewObjectByName, viewPlotByName };
}
