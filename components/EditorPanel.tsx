import React, { useEffect, useRef } from 'react';
import Editor, { OnMount } from "@monaco-editor/react";
import type { editor } from 'monaco-editor';
import { FileCode } from 'lucide-react';
import type { Language } from '../App';

interface EditorPanelProps {
    code: string;
    setCode: (code: string) => void;
    onRun: () => void;
    isLoading: boolean;
    commandHistory: string[];
    historyIndex: number;
    setHistoryIndex: (index: number) => void;
    tempUserCode: string;
    setTempUserCode: (code: string) => void;
    language: Language;
    setLanguage: (language: Language) => void;
}

function formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

const LanguageButton: React.FC<{
    isActive: boolean;
    onClick: () => void;
    children: React.ReactNode;
}> = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-3 py-1 text-xs font-semibold rounded ${
            isActive
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        } transition-all duration-150`}
    >
        {children}
    </button>
);

export function EditorPanel({ 
    code, setCode, onRun, isLoading,
    commandHistory, historyIndex, setHistoryIndex, tempUserCode, setTempUserCode,
    language, setLanguage
}: EditorPanelProps) {

    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    useEffect(() => {
        if (historyIndex > -1 && code !== commandHistory[historyIndex]) {
            setHistoryIndex(-1);
        }
    }, [code, historyIndex, commandHistory, setHistoryIndex]);
    
    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
            onRun();
        });

        editor.onKeyDown(e => {
            const position = editor.getPosition();
            const isFirstLine = position?.lineNumber === 1;

            if (e.keyCode === monaco.KeyCode.UpArrow && isFirstLine) {
                e.preventDefault();
                if (commandHistory.length === 0) return;

                if (historyIndex === -1) {
                    setTempUserCode(code);
                }

                const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
                setHistoryIndex(newIndex);
                setCode(commandHistory[newIndex]);
            }
        });

        editor.onKeyDown(e => {
            const position = editor.getPosition();
            const lineCount = editor.getModel()?.getLineCount() || 1;
            const isLastLine = position?.lineNumber === lineCount;

            if (e.keyCode === monaco.KeyCode.DownArrow && isLastLine) {
                 e.preventDefault();
                if (historyIndex === -1) return;

                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);

                if (newIndex < 0) {
                    setCode(tempUserCode);
                } else {
                    setCode(commandHistory[newIndex]);
                }
            }
        });
    };
    
    const fileName = language === 'r' ? 'script.R' : 'script.py';

    return (
        <div className="flex flex-col h-full bg-white text-gray-800 rounded-lg shadow-lg border border-gray-200">
            <div className="flex-shrink-0 p-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between rounded-t-lg">
                <div className="flex items-center space-x-2 text-gray-600">
                    <FileCode className="h-4 w-4" />
                    <span className="font-semibold text-sm">{fileName}</span>
                    <span className="text-xs text-gray-500">({formatBytes(new Blob([code]).size)})</span>
                </div>
                 <div className="flex items-center space-x-4">
                     <div className="p-0.5 bg-gray-300 rounded-md flex space-x-1">
                        <LanguageButton isActive={language === 'r'} onClick={() => setLanguage('r')}>
                           R
                        </LanguageButton>
                        <LanguageButton isActive={language === 'python'} onClick={() => setLanguage('python')}>
                           Python
                        </LanguageButton>
                    </div>
                    <button 
                        onClick={onRun} 
                        disabled={isLoading} 
                        className="px-4 py-1 text-sm font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                        title="Run code (Ctrl+Enter or Cmd+Enter)"
                    >
                        {isLoading ? 'Running...' : 'Run'}
                    </button>
                </div>
            </div>
            <div className="flex-grow relative">
                 <Editor
                    height="100%"
                    language={language}
                    theme="vs-dark"
                    value={code}
                    onMount={handleEditorDidMount}
                    onChange={(value) => {
                         if (historyIndex !== -1) {
                            setHistoryIndex(-1);
                        }
                        setCode(value || "");
                    }}
                    options={{
                        minimap: { enabled: false },
                        fontSize: 13,
                        wordWrap: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                    }}
                 />
            </div>
        </div>
    );
}