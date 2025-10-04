
export interface ConsoleOutput {
  type: 'input' | 'stdout' | 'stderr' | 'system';
  message: string;
}

export interface EnvObject {
  objectType: 'function' | 'variable';
  class: string[];
  str: string;
}

export interface Environment {
  [key: string]: EnvObject;
}

export interface PythonEnvObject {
  type: string;
  repr: string;
  is_dataframe: boolean;
}

export interface PythonEnvironment {
  [key: string]: PythonEnvObject;
}

export interface TableData {
  name: string;
  data: Record<string, any>[];
  columns: string[];
}

export interface PlotData {
  id: string;
  dataUrl: string;
}

declare global {
  interface Window {
    webr: any;
    loadPyodide: (config: any) => Promise<any>;
    pyodide: any;
    webrDataViewer: {
      viewData: (name: string, data: any) => void;
    };
  }
}
