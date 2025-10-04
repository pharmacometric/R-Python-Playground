import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileText, Database, Package, ChevronLeft, ChevronRight, Brush, Download, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import type { ConsoleOutput, PythonEnvironment, TableData, PlotData } from '../types';

interface PythonRightPanelProps {
  consoleOutput: ConsoleOutput[];
  environment: PythonEnvironment;
  tableData: TableData | null;
  plots: PlotData[];
  onClearPlots: () => void;
  onClearTable: () => void;
  onClearConsole: () => void;
  onViewObject: (name: string) => void;
  runCode: (code: string) => void;
}

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    isOpen: boolean;
    onToggle: () => void;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, isOpen, onToggle }) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <button 
        onClick={onToggle} 
        className="w-full text-left p-2 bg-gray-100 hover:bg-gray-200 flex justify-between items-center text-gray-700 flex-shrink-0 border-b border-gray-200"
        aria-expanded={isOpen}
      >
        <h2 className="font-bold text-sm uppercase tracking-wider">{title}</h2>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isOpen ? '' : '-rotate-90'}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {isOpen && (
        <div className="flex-grow flex flex-col overflow-hidden">
          {children}
        </div>
      )}
    </div>
  );
};

export function PythonRightPanel({ consoleOutput, environment, tableData, plots, onClearPlots, onClearTable, onClearConsole, onViewObject, runCode }: PythonRightPanelProps) {
  const [activeTopTab, setActiveTopTab] = useState('Console');
  const [activeBottomTab, setActiveBottomTab] = useState('Viewer');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isOutputOpen, setIsOutputOpen] = useState(true);
  
  useEffect(() => {
    if (plots.length > 0) setActiveBottomTab('Plots');
  }, [plots]);

  useEffect(() => {
    if (tableData) setActiveBottomTab('Viewer');
  }, [tableData]);

  const handleViewObject = (name: string) => {
    onViewObject(name);
    setActiveBottomTab('Viewer');
  };

  return (
    <div className="h-full flex flex-col text-sm bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden">
      <div className={isWorkspaceOpen ? (isOutputOpen ? 'h-1/2' : 'flex-1 min-h-0') : 'flex-shrink-0'}>
        <CollapsibleSection 
            title="Workspace"
            isOpen={isWorkspaceOpen}
            onToggle={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
        >
            <div className="flex-shrink-0 border-b border-gray-200">
                <nav className="flex space-x-2 p-1 bg-white">
                    <TabButton isActive={activeTopTab === 'Console'} onClick={() => setActiveTopTab('Console')}>Console</TabButton>
                    <TabButton isActive={activeTopTab === 'Environment'} onClick={() => setActiveTopTab('Environment')}>Environment</TabButton>
                </nav>
            </div>
            <div className="flex-grow overflow-hidden p-2 bg-white">
                {activeTopTab === 'Console' && <ConsolePanel output={consoleOutput} onClear={onClearConsole} runCode={runCode} />}
                {activeTopTab === 'Environment' && <EnvironmentPanel environment={environment} onViewObject={handleViewObject} />}
            </div>
        </CollapsibleSection>
      </div>

      <div className={`border-t border-gray-200 ${isOutputOpen ? (isWorkspaceOpen ? 'h-1/2' : 'flex-1 min-h-0') : 'flex-shrink-0'}`}>
        <CollapsibleSection 
            title="Output"
            isOpen={isOutputOpen}
            onToggle={() => setIsOutputOpen(!isOutputOpen)}
        >
            <div className="flex-shrink-0 border-b border-gray-200">
                <nav className="flex space-x-2 p-1 bg-white">
                    <TabButton isActive={activeBottomTab === 'Viewer'} onClick={() => setActiveBottomTab('Viewer')}>Viewer</TabButton>
                    <TabButton isActive={activeBottomTab === 'Plots'} onClick={() => setActiveBottomTab('Plots')}>Plots</TabButton>
                </nav>
            </div>
            <div className="flex-grow overflow-hidden bg-white">
                {activeBottomTab === 'Viewer' && <ViewerPanel tableData={tableData} onClear={onClearTable}/>}
                {activeBottomTab === 'Plots' && <PlotPanel plots={plots} onClear={onClearPlots}/>}
            </div>
        </CollapsibleSection>
      </div>
    </div>
  );
}

const TabButton: React.FC<{ isActive: boolean; onClick: () => void; children: React.ReactNode }> = ({ isActive, onClick, children }) => (
    <button onClick={onClick} className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}>
        {children}
    </button>
);

const ConsolePanel = ({ output, onClear, runCode }: { output: ConsoleOutput[], onClear: () => void, runCode: (code: string) => void }) => {
    const endOfConsoleRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        endOfConsoleRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [output]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && inputValue.trim()) {
            e.preventDefault();
            runCode(inputValue);
            setInputValue('');
        }
    };
    
    return (
        <div className="h-full font-mono text-xs whitespace-pre-wrap relative flex flex-col" onClick={() => inputRef.current?.focus()}>
            {output.length > 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); onClear(); }}
                    className="absolute top-0 right-0 p-1.5 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 z-10"
                    title="Clear console"
                >
                    <Brush className="h-4 w-4" />
                </button>
            )}
            <div className="flex-grow overflow-y-auto">
                {output.map((line, index) => {
                    let colorClass = '';
                    let prefix = '';
                    switch (line.type) {
                        case 'input': colorClass = 'text-blue-600'; prefix = '>>> '; break;
                        case 'stdout': colorClass = 'text-gray-800'; break;
                        case 'stderr': colorClass = 'text-red-600'; break;
                        case 'system': colorClass = 'text-purple-600'; prefix = '# '; break;
                    }
                    return <p key={index} className={colorClass}>{prefix}{line.message}</p>;
                })}
                <div ref={endOfConsoleRef} />
            </div>
            <div className="flex-shrink-0 flex items-center mt-1">
                <span className="text-blue-600 font-bold">&gt;&gt;&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none p-0 pl-2 font-mono text-xs"
                    autoFocus
                    spellCheck="false"
                />
            </div>
        </div>
    );
};

const EnvironmentPanel = ({ environment, onViewObject }: { environment: PythonEnvironment, onViewObject: (name: string) => void }) => (
    <div className="h-full overflow-y-auto">
        {Object.keys(environment).length === 0 ? (
            <p className="text-gray-500 italic">Environment is empty.</p>
        ) : (
            <table className="w-full text-left text-xs">
                <thead>
                    <tr className="border-b border-gray-300">
                        <th className="p-1 font-semibold text-gray-700">Name</th>
                        <th className="p-1 font-semibold text-gray-700">Type</th>
                        <th className="p-1 font-semibold text-gray-700">Value</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(environment).map(([name, details]) => {
                         const rowClass = details.is_dataframe
                            ? "border-b border-gray-200 hover:bg-blue-50 cursor-pointer"
                            : "border-b border-gray-200 hover:bg-gray-100";
                        return (
                            <tr key={name} className={rowClass} onClick={details.is_dataframe ? () => onViewObject(name) : undefined}>
                                <td className="p-1 font-mono text-gray-900 flex items-center space-x-2">
                                    {details.is_dataframe 
                                     ? <Database className="h-3 w-3 text-green-600 flex-shrink-0" /> 
                                     : <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" />}
                                    <span>{name}</span>
                                </td>
                                <td className="p-1 font-mono text-gray-500">{details.type}</td>
                                <td className="p-1 font-mono text-gray-500 truncate" title={details.repr}>{details.repr}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        )}
    </div>
);

const ViewerPanel = ({ tableData, onClear }: { tableData: TableData | null; onClear: () => void; }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' }>({ key: null, direction: 'ascending' });

    const sortedData = useMemo(() => {
        if (!tableData?.data) return [];
        let sortableItems = [...tableData.data];
        if (sortConfig.key !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key!];
                const valB = b[sortConfig.key!];
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                if (typeof valA === 'number' && typeof valB === 'number') {
                    return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
                }
                const strA = String(valA).toLowerCase();
                const strB = String(valB).toLowerCase();
                if (strA < strB) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (strA > strB) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [tableData?.data, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (columnName: string) => {
        if (sortConfig.key !== columnName) return <ChevronsUpDown className="h-3 w-3 text-gray-400" />;
        if (sortConfig.direction === 'ascending') return <ArrowUp className="h-3 w-3 text-blue-600" />;
        return <ArrowDown className="h-3 w-3 text-blue-600" />;
    };
    
    if (!tableData) return <p className="text-gray-500 italic p-4">No data to display. Click a DataFrame in the Environment tab.</p>;

    return (
        <div className="h-full flex flex-col p-2 bg-white">
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
                 <h3 className="font-bold text-base text-gray-800 font-sans">{tableData.name}</h3>
                 <button onClick={onClear} className="px-3 py-1 text-xs font-semibold bg-gray-200 rounded hover:bg-gray-300">Clear</button>
            </div>
            <div className="overflow-auto border rounded-sm flex-grow shadow-inner bg-gray-50">
                <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr>
                            {tableData.columns.map(col => (
                                <th key={col} className="p-2 font-bold border bg-gray-200 text-left cursor-pointer hover:bg-gray-300" onClick={() => requestSort(col)}>
                                    <div className="flex items-center justify-between">
                                        <span>{col}</span>
                                        {getSortIcon(col)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {sortedData.map((row, i) => (
                            <tr key={i} className="even:bg-gray-50 hover:bg-blue-50">
                                {tableData.columns.map(col => (
                                    <td key={col} className="p-2 border whitespace-nowrap font-mono">{String(row[col])}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedData.length === 0 && <p className="text-center p-4">This data frame has 0 rows.</p>}
            </div>
        </div>
    );
};

const PlotPanel = ({ plots, onClear }: { plots: PlotData[]; onClear: () => void; }) => {
    const [currentPlotIndex, setCurrentPlotIndex] = useState(0);

    useEffect(() => {
        if (plots.length > 0) setCurrentPlotIndex(plots.length - 1);
    }, [plots.length]);

    const handleNextPlot = () => setCurrentPlotIndex(prev => Math.min(prev + 1, plots.length - 1));
    const handlePrevPlot = () => setCurrentPlotIndex(prev => Math.max(prev - 1, 0));

    const handleExportPlot = () => {
        const currentPlot = plots[currentPlotIndex];
        if (!currentPlot) return;
        const link = document.createElement('a');
        link.href = currentPlot.dataUrl;
        link.download = `python-plot-${currentPlotIndex + 1}.png`;
        link.click();
    };

    if (plots.length === 0) {
        return <p className="text-gray-500 italic p-4">No plots to display. Run plotting code.</p>;
    }

    const currentPlot = plots[currentPlotIndex];

    return (
        <div className="h-full flex flex-col p-2 space-y-2">
            <div className="flex justify-between items-center flex-shrink-0">
                <div className="flex items-center space-x-2">
                    {plots.length > 1 && (
                        <>
                            <button onClick={handlePrevPlot} disabled={currentPlotIndex === 0} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-xs font-medium">Plot {currentPlotIndex + 1} of {plots.length}</span>
                            <button onClick={handleNextPlot} disabled={currentPlotIndex === plots.length - 1} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={handleExportPlot} className="p-1 rounded-full bg-gray-200 hover:bg-gray-300" title="Export plot as PNG">
                        <Download className="h-4 w-4" />
                    </button>
                    <button onClick={() => { onClear(); setCurrentPlotIndex(0); }} className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700">
                        Clear Plots
                    </button>
                </div>
            </div>
            <div className="flex-grow relative bg-gray-50 rounded-md border overflow-hidden">
                {currentPlot && (
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                         <img src={currentPlot.dataUrl} alt={`Python Plot ${currentPlotIndex + 1}`} className="max-w-full max-h-full object-contain" />
                    </div>
                )}
            </div>
        </div>
    );
};