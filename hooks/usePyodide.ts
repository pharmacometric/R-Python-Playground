import { useState, useEffect, useRef } from 'react';
import type { ConsoleOutput, PythonEnvironment, TableData, PlotData } from '../types';

let pyodide: any;
let plotIdCounter = 0;

export function usePyodide() {
  const [isLoading, setIsLoading] = useState(true);
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
    try {
      const code = `
import json
import pandas as pd
import sys

_vars = {}
_builtins = set(dir(__builtins__))
_scope = globals()

# Filter out modules and built-ins
_vars_to_ignore = {
    '__name__', '__doc__', '__package__', '__loader__', '__spec__', '__annotations__',
    '__builtins__', '_vars', '_builtins', '_scope', '_vars_to_ignore', 'json', 'pd', 'sys', 'pyodide'
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
        }
json.dumps(_vars)
      `;
      const envJson = await pyodide.runPythonAsync(code);
      setEnvironment(JSON.parse(envJson));
    } catch (error) {
        console.error('Error updating Python environment:', error);
    }
  };

  const runCode = async (code: string) => {
    if (!pyodide || isLoading) return;
    setConsoleOutput(prev => [...prev, { type: 'input', message: code }]);
    
    try {
        await pyodide.runPythonAsync(`
import matplotlib.pyplot as plt
# Reset plot state for new execution
plt.close('all')
`);
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
    # Correctly encode to base64 string
    plots.append(base64.b64encode(buf.read()).decode('utf-8'))
    plt.close(fig)

json.dumps(plots)
`;
        const plotsJson = await pyodide.runPythonAsync(plotsCode);
        const newPlots = JSON.parse(plotsJson);
        if (newPlots.length > 0) {
            setPlots(prev => [
                ...prev, 
                ...newPlots.map((p: string) => ({
                    id: `plot-${plotIdCounter++}`,
                    dataUrl: `data:image/png;base64,${p}`
                }))
            ]);
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

  const clearPlots = () => setPlots([]);
  const clearTable = () => setTableData(null);
  const clearConsole = () => setConsoleOutput([]);

  return { isLoading, consoleOutput, environment, tableData, plots, runCode, clearPlots, clearTable, clearConsole, viewObjectByName };
}
