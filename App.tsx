import React, { useState, useRef, useCallback, useEffect } from 'react';
import { EditorPanel } from './components/EditorPanel';
import { RightPanel } from './components/RightPanel';
import { PythonRightPanel } from './components/PythonRightPanel';
import { useWebR } from './hooks/useWebR';
import { usePyodide } from './hooks/usePyodide';
import { INITIAL_CODE as INITIAL_R_CODE, INITIAL_PYTHON_CODE } from './constants';

export type Language = 'r' | 'python';

function App() {
    const [language, setLanguage] = useState<Language>('r');
    
    // R state
    const webR = useWebR();
    const [rCode, setRCode] = useState(INITIAL_R_CODE);

    // Python state
    const pyodide = usePyodide();
    const [pythonCode, setPythonCode] = useState(INITIAL_PYTHON_CODE);

    // Editor and panel state
    const [editorCode, setEditorCode] = useState(INITIAL_R_CODE);
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState<number>(-1);
    const [tempUserCode, setTempUserCode] = useState('');
    const [leftPanelWidth, setLeftPanelWidth] = useState(50);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (language === 'r') {
            setEditorCode(rCode);
        } else {
            setEditorCode(pythonCode);
        }
        setCommandHistory([]);
        setHistoryIndex(-1);
        setTempUserCode('');
    }, [language, rCode, pythonCode]);
    
    const handleCodeChange = (newCode: string) => {
        if (language === 'r') {
            setRCode(newCode);
        } else {
            setPythonCode(newCode);
        }
        setEditorCode(newCode);
    };

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        const containerNode = containerRef.current;
        if (!containerNode) return;

        const leftPanelNode = containerNode.querySelector('#left-panel') as HTMLElement;
        if (!leftPanelNode) return;

        const startX = e.clientX;
        const startWidth = leftPanelNode.getBoundingClientRect().width;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const containerWidth = containerNode.getBoundingClientRect().width;
            if (containerWidth === 0) return;

            let newWidthPercent = ((startWidth + dx) / containerWidth) * 100;
            const minWidthPercent = 20;
            const maxWidthPercent = 80;
            newWidthPercent = Math.max(minWidthPercent, Math.min(newWidthPercent, maxWidthPercent));
            
            setLeftPanelWidth(newWidthPercent);
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, []);

    const handleRun = () => {
        const trimmedCode = editorCode.trim();
        if (trimmedCode) {
            if (language === 'r') {
                webR.runCode(trimmedCode);
            } else {
                pyodide.runCode(trimmedCode);
            }
            setCommandHistory(prev => [trimmedCode, ...prev.filter(c => c !== trimmedCode)]);
            setHistoryIndex(-1);
            setTempUserCode('');
        }
    };
    
    const isLoading = language === 'r' ? webR.isLoading : pyodide.isLoading;

    return (
        <main className="h-screen bg-gray-100 text-gray-800 font-sans flex flex-col">
            <div ref={containerRef} className="flex flex-grow min-h-0">
                <div
                    id="left-panel"
                    className="p-2 h-full"
                    style={{ width: `${leftPanelWidth}%` }}
                >
                    <EditorPanel
                        code={editorCode}
                        setCode={handleCodeChange}
                        onRun={handleRun}
                        isLoading={isLoading}
                        commandHistory={commandHistory}
                        historyIndex={historyIndex}
                        setHistoryIndex={setHistoryIndex}
                        tempUserCode={tempUserCode}
                        setTempUserCode={setTempUserCode}
                        language={language}
                        setLanguage={setLanguage}
                    />
                </div>

                <div
                    onMouseDown={handleMouseDown}
                    className="flex-shrink-0 w-1.5 bg-gray-200 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors duration-200 ease-in-out"
                    title="Drag to resize"
                />

                <div
                    className="p-2 h-full overflow-y-auto"
                    style={{ width: `${100 - leftPanelWidth}%` }}
                >
                    {language === 'r' ? (
                        <RightPanel
                            consoleOutput={webR.consoleOutput}
                            environment={webR.environment}
                            tableData={webR.tableData}
                            plots={webR.plots}
                            packages={webR.packages}
                            onClearPlots={webR.clearPlots}
                            onClearTable={webR.clearTable}
                            onClearConsole={webR.clearConsole}
                            onViewObject={webR.viewObjectByName}
                            runCode={webR.runCode}
                        />
                    ) : (
                         <PythonRightPanel
                            consoleOutput={pyodide.consoleOutput}
                            environment={pyodide.environment}
                            tableData={pyodide.tableData}
                            plots={pyodide.plots}
                            onClearPlots={pyodide.clearPlots}
                            onClearTable={pyodide.clearTable}
                            onClearConsole={pyodide.clearConsole}
                            onViewObject={pyodide.viewObjectByName}
                            runCode={pyodide.runCode}
                        />
                    )}
                </div>
            </div>
        </main>
    );
}

export default App;