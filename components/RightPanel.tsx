import React, { useState, useRef, useEffect, useMemo } from 'react';
import { FileText, FunctionSquare, Package, ChevronLeft, ChevronRight, Brush, Download, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import type { ConsoleOutput, Environment, TableData, PlotData } from '../types';

interface RightPanelProps {
  consoleOutput: ConsoleOutput[];
  environment: Environment;
  tableData: TableData | null;
  plots: PlotData[];
  packages: Record<string, string>;
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
    extra?: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, isOpen, onToggle, extra }) => {
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <button 
        onClick={onToggle} 
        className="w-full text-left p-2 bg-gray-100 hover:bg-gray-200 flex justify-between items-center text-gray-700 flex-shrink-0 border-b border-gray-200"
        aria-expanded={isOpen}
      >
        <div className="flex items-center space-x-2">
            <h2 className="font-bold text-sm uppercase tracking-wider">{title}</h2>
            {extra}
        </div>
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


export function RightPanel({ consoleOutput, environment, tableData, plots, packages, onClearPlots, onClearTable, onClearConsole, onViewObject, runCode }: RightPanelProps) {
  const [activeTopTab, setActiveTopTab] = useState('Console');
  const [activeBottomTab, setActiveBottomTab] = useState('Tables');
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(true);
  const [isOutputOpen, setIsOutputOpen] = useState(true);
  
  useEffect(() => {
    if (plots.length > 0) {
        setActiveBottomTab('Plots');
    }
  }, [plots]);

  useEffect(() => {
    if (tableData) {
        setActiveBottomTab('Tables');
    }
  }, [tableData]);

  useEffect(() => {
    if (consoleOutput.some(line => line.type === 'stderr')) {
        setActiveBottomTab('Logs');
    }
  }, [consoleOutput]);

  const handleViewObject = (name: string) => {
    onViewObject(name);
    setActiveBottomTab('Tables');
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
                    <TabButton isActive={activeTopTab === 'Package'} onClick={() => setActiveTopTab('Package')}>Package</TabButton>
                </nav>
            </div>
            <div className="flex-grow overflow-hidden p-2 bg-white">
                {activeTopTab === 'Console' && <ConsolePanel output={consoleOutput} onClear={onClearConsole} runCode={runCode} />}
                {activeTopTab === 'Environment' && <EnvironmentPanel environment={environment} onViewObject={handleViewObject} />}
                {activeTopTab === 'Package' && <PackagesPanel packages={packages} />}
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
                    <TabButton isActive={activeBottomTab === 'Tables'} onClick={() => setActiveBottomTab('Tables')}>Tables</TabButton>
                    <TabButton isActive={activeBottomTab === 'Plots'} onClick={() => setActiveBottomTab('Plots')}>Plots</TabButton>
                    <TabButton isActive={activeBottomTab === 'Logs'} onClick={() => setActiveBottomTab('Logs')}>Logs</TabButton>
                </nav>
            </div>
            <div className="flex-grow overflow-hidden bg-white">
                {activeBottomTab === 'Tables' && <ViewerPanel tableData={tableData} onClear={onClearTable}/>}
                {activeBottomTab === 'Plots' && <PlotPanel plots={plots} onClear={onClearPlots}/>}
                {activeBottomTab === 'Logs' && <LogsPanel output={consoleOutput} />}
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
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [tempUserCode, setTempUserCode] = useState('');

    useEffect(() => {
        endOfConsoleRef.current?.scrollIntoView({ behavior: 'auto' });
    }, [output]);

    const focusInput = () => inputRef.current?.focus();

    useEffect(() => {
        if (historyIndex > -1 && inputValue !== commandHistory[historyIndex]) {
            setHistoryIndex(-1);
        }
    }, [inputValue, historyIndex, commandHistory]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const trimmedCode = inputValue.trim();
            if (trimmedCode) {
                runCode(trimmedCode);
                setCommandHistory(prev => [trimmedCode, ...prev.filter(c => c !== trimmedCode)]);
                setHistoryIndex(-1);
                setInputValue('');
                setTempUserCode('');
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (commandHistory.length === 0) return;
            if (historyIndex === -1) {
                setTempUserCode(inputValue);
            }
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setInputValue(commandHistory[newIndex]);
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex === -1) return;
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            if (newIndex < 0) {
                setInputValue(tempUserCode);
            } else {
                setInputValue(commandHistory[newIndex]);
            }
        }
    };
    
    return (
        <div className="h-full font-mono text-xs whitespace-pre-wrap relative flex flex-col cursor-text" onClick={focusInput}>
            {output.length > 0 && (
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClear();
                    }}
                    className="absolute top-0 right-0 p-1.5 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 hover:text-gray-800 transition-colors z-10"
                    title="Clear console"
                    aria-label="Clear console"
                >
                    <Brush className="h-4 w-4" />
                </button>
            )}
            <div className="flex-grow overflow-y-auto">
                {output.map((line, index) => {
                    let colorClass = '';
                    let prefix = '';
                    switch (line.type) {
                        case 'input':
                            colorClass = 'text-blue-600';
                            prefix = '> ';
                            break;
                        case 'stdout':
                            colorClass = 'text-gray-800';
                            break;
                        case 'stderr':
                            colorClass = 'text-red-600';
                            break;
                        case 'system':
                            colorClass = 'text-purple-600';
                            prefix = '# ';
                            break;
                    }
                    return <p key={index} className={colorClass}>{prefix}{line.message}</p>;
                })}
                <div ref={endOfConsoleRef} />
            </div>
            <div className="flex-shrink-0 flex items-center mt-1">
                <span className="text-blue-600 font-bold">&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-grow bg-transparent border-none focus:ring-0 focus:outline-none p-0 pl-2 font-mono text-xs text-gray-800"
                    autoFocus
                    spellCheck="false"
                    aria-label="R console input"
                />
            </div>
        </div>
    );
};

const LogsPanel = ({ output }: { output: ConsoleOutput[] }) => {
    const endOfLogsRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        endOfLogsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [output]);

    const filteredOutput = output.filter(line => line.type !== 'input');

    if (filteredOutput.length === 0) {
        return <p className="text-gray-500 italic p-2">No log output yet.</p>
    }

    return (
        <div className="h-full overflow-y-auto font-mono text-xs whitespace-pre-wrap p-2">
            {filteredOutput.map((line, index) => {
                let colorClass = '';
                let prefix = '';
                switch (line.type) {
                    case 'stdout':
                        colorClass = 'text-gray-800';
                        break;
                    case 'stderr':
                        colorClass = 'text-red-600';
                        break;
                    case 'system':
                        colorClass = 'text-purple-600';
                        prefix = '# ';
                        break;
                }
                return <p key={index} className={colorClass}>{prefix}{line.message}</p>;
            })}
            <div ref={endOfLogsRef} />
        </div>
    );
};


const EnvironmentPanel = ({ environment, onViewObject }: { environment: Environment, onViewObject: (name: string) => void }) => (
    <div className="h-full overflow-y-auto">
        {Object.keys(environment).length === 0 ? (
            <p className="text-gray-500 italic">Environment is empty.</p>
        ) : (
            <table className="w-full text-left text-xs">
                <thead>
                    <tr className="border-b border-gray-300">
                        <th className="p-1 font-semibold text-gray-700">Name</th>
                        <th className="p-1 font-semibold text-gray-700">Details</th>
                    </tr>
                </thead>
                <tbody>
                    {Object.entries(environment).map(([name, details]) => {
                        const isDataFrame = details.class.includes('data.frame');
                        const rowClass = isDataFrame
                            ? "border-b border-gray-200 hover:bg-blue-50 cursor-pointer"
                            : "border-b border-gray-200 hover:bg-gray-100";

                        return (
                            <tr
                                key={name}
                                className={rowClass}
                                onClick={isDataFrame ? () => onViewObject(name) : undefined}
                                title={isDataFrame ? `Click to view '${name}' in the Tables tab` : ''}
                            >
                                <td className="p-1 font-mono text-gray-900 flex items-center space-x-2">
                                    {details.objectType === 'function'
                                        ? <FunctionSquare className="h-3 w-3 text-purple-600 flex-shrink-0" aria-label="Function"/>
                                        : <FileText className="h-3 w-3 text-blue-600 flex-shrink-0" aria-label="Variable"/>
                                    }
                                    <span>{name}</span>
                                </td>
                                <td className="p-1 font-mono text-gray-500">{details.str}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        )}
    </div>
);

const PackagesPanel = ({ packages }: { packages: Record<string, string> }) => (
    <div className="h-full overflow-y-auto">
        {Object.keys(packages).length === 0 ? (
            <p className="text-gray-500 italic">No user packages loaded.</p>
        ) : (
            <>
                <p className="text-gray-600 text-xs mb-3">
                    These packages are currently loaded in the R environment:
                </p>
                <div className="grid grid-cols-3 gap-x-4 gap-y-1">
                    {Object.entries(packages)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([pkgName, pkgVersion]) => (
                        <div key={pkgName} className="font-mono text-xs text-gray-800 p-1 rounded hover:bg-gray-100 flex items-center space-x-2 truncate">
                            <Package className="h-3 w-3 text-green-600 flex-shrink-0" aria-label="Package"/>
                            <span className="truncate" title={`${pkgName} (${pkgVersion})`}>
                                {pkgName} <span className="text-gray-500">({pkgVersion})</span>
                            </span>
                        </div>
                    ))}
                </div>
            </>
        )}
    </div>
);

const ViewerPanel = ({ tableData, onClear }: { tableData: TableData | null; onClear: () => void; }) => {
    const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' }>({
        key: null,
        direction: 'ascending',
    });

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

                if (strA < strB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (strA > strB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
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
        if (sortConfig.key !== columnName) {
            return <ChevronsUpDown className="h-3 w-3 text-gray-400" />;
        }
        if (sortConfig.direction === 'ascending') {
            return <ArrowUp className="h-3 w-3 text-blue-600" />;
        }
        return <ArrowDown className="h-3 w-3 text-blue-600" />;
    };
    
    if (!tableData) return <p className="text-gray-500 italic p-4">No data to display. Run code that uses `View()`.</p>;

    return (
        <div className="h-full flex flex-col p-2 bg-white">
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
                 <h3 className="font-bold text-base text-gray-800 font-sans">{tableData.name}</h3>
                 <button onClick={onClear} className="px-3 py-1 text-xs font-semibold bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">Clear</button>
            </div>
           
            <div className="overflow-auto border border-gray-300 rounded-sm flex-grow shadow-inner bg-gray-50">
                <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-gray-100 z-10">
                        <tr>
                            <th className="p-2 font-bold border border-gray-300 text-gray-500 bg-gray-200 w-12 text-center">#</th>
                            {tableData.columns.map(col => (
                                <th 
                                    key={col} 
                                    className="p-2 font-bold border border-gray-300 bg-gray-200 text-gray-700 text-left cursor-pointer hover:bg-gray-300 transition-colors select-none"
                                    onClick={() => requestSort(col)}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{col}</span>
                                        {getSortIcon(col)}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-gray-900 bg-white">
                        {sortedData.map((row, i) => (
                            <tr key={i} className="even:bg-gray-50 hover:bg-blue-50">
                                <td className="p-2 border border-gray-200 text-center text-gray-500 bg-gray-100 font-mono">{i + 1}</td>
                                {tableData.columns.map(col => (
                                    <td key={col} className="p-2 border border-gray-200 whitespace-nowrap font-mono">
                                        {String(row[col])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {sortedData.length === 0 && (
                    <p className="text-center text-gray-500 p-4">This data frame has 0 rows.</p>
                )}
            </div>
        </div>
    );
};

const PlotPanel = ({ plots, onClear }: { plots: PlotData[]; onClear: () => void; }) => {
    const [currentPlotIndex, setCurrentPlotIndex] = useState(0);

    useEffect(() => {
        if (plots.length > 0) {
            setCurrentPlotIndex(plots.length - 1);
        }
    }, [plots.length]);

    const handleNextPlot = () => {
        setCurrentPlotIndex(prev => Math.min(prev + 1, plots.length - 1));
    };

    const handlePrevPlot = () => {
        setCurrentPlotIndex(prev => Math.max(prev - 1, 0));
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (plots.length <= 1) return;
        if (e.key === 'ArrowRight') {
            e.preventDefault();
            handleNextPlot();
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            handlePrevPlot();
        }
    };

    const handleExportPlot = () => {
        const currentPlot = plots[currentPlotIndex];
        if (!currentPlot) return;

        const link = document.createElement('a');
        link.href = currentPlot.dataUrl;
        link.download = `R-plot-${currentPlotIndex + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (plots.length === 0) {
        return <p className="text-gray-500 italic p-4">No plots to display. Run plotting code.</p>;
    }

    const currentPlot = plots[currentPlotIndex];

    return (
        <div 
            className="h-full flex flex-col p-2 space-y-2 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
            tabIndex={0}
            onKeyDown={handleKeyDown}
            aria-label="Plot viewer. Use left and right arrow keys to navigate plots."
        >
            <div className="flex justify-between items-center flex-shrink-0">
                <div className="flex items-center space-x-2">
                    {plots.length > 1 && (
                        <>
                            <button 
                                onClick={handlePrevPlot} 
                                disabled={currentPlotIndex === 0}
                                className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                aria-label="Previous plot"
                            >
                                <ChevronLeft className="h-4 w-4 text-gray-700" />
                            </button>
                            <span className="text-xs font-medium text-gray-600 select-none">
                                Plot {currentPlotIndex + 1} of {plots.length}
                            </span>
                            <button 
                                onClick={handleNextPlot} 
                                disabled={currentPlotIndex === plots.length - 1}
                                className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                                aria-label="Next plot"
                            >
                                <ChevronRight className="h-4 w-4 text-gray-700" />
                            </button>
                        </>
                    )}
                </div>
                
                <div className="flex items-center space-x-2">
                    <button 
                        onClick={handleExportPlot}
                        className="p-1 rounded-full bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                        title="Export plot as PNG"
                        aria-label="Export plot as PNG"
                        disabled={!currentPlot}
                    >
                        <Download className="h-4 w-4 text-gray-700" />
                    </button>
                    <button 
                        onClick={() => {
                            onClear();
                            setCurrentPlotIndex(0);
                        }} 
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Clear Plots
                    </button>
                </div>
            </div>
            <div className="flex-grow relative bg-gray-50 rounded-md border overflow-hidden">
                {currentPlot && (
                    <div className="absolute inset-0 flex items-center justify-center p-2">
                         <img 
                            src={currentPlot.dataUrl} 
                            alt={`R Plot ${currentPlotIndex + 1}`} 
                            className="max-w-full max-h-full object-contain" 
                         />
                    </div>
                )}
            </div>
        </div>
    );
};