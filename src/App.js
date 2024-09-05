import React, { useState, useEffect } from 'react';
import ReactJson from 'react-json-view';
import './App.css';
import tauBenchInstructions from './tauBenchInstructions';

function App() {
  const [resultsJson, setResultsJson] = useState(null);
  const [instructionsJson, setInstructionsJson] = useState(null);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [fileName, setFileName] = useState(null);

  useEffect(() => {
    setInstructionsJson(tauBenchInstructions());
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        setResultsJson(json);
      } catch (error) {
        console.error('Error parsing JSON:', error);
        alert('Error parsing JSON file. Please make sure it\'s a valid JSON.');
      }
    };

    reader.readAsText(file);
  };

  const renderSummary = () => {
    if (!resultsJson || !Array.isArray(resultsJson)) return null;

    const entryCount = resultsJson.length;
    const fields = Object.keys(resultsJson[0] || {});

    return (
      <div className="summary">
        <h2>JSON Summary</h2>
        <p>Number of entries: {entryCount}</p>
        <p>Fields: {fields.join(', ')}</p>
        <h3>Select an entry to view:</h3>
        <select onChange={(e) => setSelectedEntry(Number(e.target.value))}>
          <option value="">Select an entry</option>
          {resultsJson.map((entry, index) => (
            <option key={index} value={index}>
              Entry {index} - Reward: {entry.reward}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const convertToCSV = (json) => {
    if (!json || json.length === 0) return '';
  
    const fields = Object.keys(json[0]);
    const csv = [
      fields.join(','),
      ...json.map(row => fields.map(field => JSON.stringify(row[field])).join(','))
    ].join('\n');
  
    return csv;
  };

  const handleCSVDownload = () => {
    if (!resultsJson || !fileName) return;

    const csv = convertToCSV(resultsJson);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      const csvFileName = fileName.replace(/\.[^/.]+$/, ".csv");
      link.setAttribute('download', csvFileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="App">
      <h1>JSON Visualizer</h1>
      <div className="file-actions">
        <input type="file" accept=".json" onChange={handleFileUpload} />
        {resultsJson && (
          <button onClick={handleCSVDownload}>Download as CSV</button>
        )}
      </div>
      {resultsJson && renderSummary()}
      {selectedEntry !== null && (
        <div>
          <div className="json-view">
            <h3>Instructions</h3>
            <ReactJson src={instructionsJson[selectedEntry]} theme="monokai" />
          </div>
          <div className="json-view">
            <h3>Results</h3>
            <ReactJson src={resultsJson[selectedEntry]} theme="monokai" />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
