'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function MailSetupTestPage() {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/test/mail-tables');
      const data = await response.json();

      if (!response.ok && data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'failed':
        return <XCircle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      default:
        return <RefreshCw className="w-6 h-6 text-gray-500 animate-spin" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'passed':
        return 'border-green-500 bg-green-50';
      case 'failed':
        return 'border-red-500 bg-red-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      default:
        return 'border-gray-300 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Mail Provisioning Setup Test</h1>
        <p className="text-gray-400 mb-8">
          This page tests if the mail account provisioning is correctly configured
        </p>

        <button
          onClick={runTests}
          disabled={loading}
          className="mb-6 px-4 py-2 bg-primary-600 hover:bg-primary-700 rounded-lg text-white font-medium disabled:opacity-50 flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Run Tests Again
        </button>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg">
            <h3 className="text-red-400 font-semibold mb-2">Error</h3>
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {loading && !results && (
          <div className="flex items-center justify-center p-12">
            <RefreshCw className="w-8 h-8 animate-spin text-primary-500" />
            <span className="ml-3 text-lg">Running tests...</span>
          </div>
        )}

        {results && (
          <div className="space-y-6">
            {/* Overall Status */}
            <div className={`p-6 rounded-lg border-2 ${getStatusColor(results.status)}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(results.status)}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Overall Status: {results.status.toUpperCase()}
                    </h2>
                    <p className="text-sm text-gray-700">
                      {results.summary.passed} passed · {results.summary.failed} failed ·{' '}
                      {results.summary.warning} warnings
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-600">{new Date(results.timestamp).toLocaleString()}</span>
              </div>
            </div>

            {/* Individual Tests */}
            <div className="space-y-4">
              {Object.entries(results.tests).map(([key, test]) => (
                <div
                  key={key}
                  className={`p-5 rounded-lg border-2 ${getStatusColor(test.status)} bg-opacity-50`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(test.status)}
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{test.name}</h3>
                      {test.message && <p className="text-gray-700 mb-2">{test.message}</p>}

                      {test.columns && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-800">Columns:</p>
                          <code className="text-xs bg-gray-200 text-gray-900 px-2 py-1 rounded">
                            {test.columns.join(', ')}
                          </code>
                        </div>
                      )}

                      {test.rowCount !== undefined && (
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-medium">Rows:</span> {test.rowCount}
                        </p>
                      )}

                      {test.hasUserId !== undefined && (
                        <p className="text-sm text-gray-700 mt-1">
                          <span className="font-medium">Has user_id column:</span>{' '}
                          {test.hasUserId ? '✅ Yes' : '❌ No'}
                        </p>
                      )}

                      {test.domains && test.domains.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-800">Configured Domains:</p>
                          <ul className="list-disc list-inside text-sm text-gray-700">
                            {test.domains.map((domain) => (
                              <li key={domain.id}>
                                {domain.name} (ID: {domain.id})
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {test.functions && (
                        <div className="mt-2">
                          <p className="text-sm font-medium text-gray-800">Functions:</p>
                          <ul className="list-none text-xs text-gray-700 space-y-1">
                            {Object.entries(test.functions).map(([fname, exists]) => (
                              <li key={fname} className="flex items-center gap-2">
                                {exists ? '✅' : '❌'} <code>{fname}</code>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {test.warning && (
                        <div className="mt-2 p-2 bg-yellow-200 border border-yellow-400 rounded">
                          <p className="text-sm font-medium text-yellow-900">⚠️ {test.warning}</p>
                        </div>
                      )}

                      {test.action && (
                        <div className="mt-2 p-3 bg-gray-900 rounded">
                          <p className="text-xs font-medium text-gray-300 mb-1">Action Required:</p>
                          <code className="text-xs text-green-400">{test.action}</code>
                        </div>
                      )}

                      {test.error && (
                        <div className="mt-2 p-2 bg-red-200 border border-red-400 rounded">
                          <p className="text-sm font-medium text-red-900">Error: {test.error}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Instructions */}
            {results.status !== 'passed' && (
              <div className="p-6 bg-gray-800 border border-gray-700 rounded-lg">
                <h3 className="text-xl font-bold mb-3">Next Steps</h3>
                <ol className="list-decimal list-inside space-y-2 text-gray-300">
                  <li>Review the failed tests above</li>
                  <li>Run the suggested SQL commands to fix any issues</li>
                  <li>Click "Run Tests Again" to verify the fixes</li>
                  <li>Once all tests pass, mail provisioning will work during user registration</li>
                </ol>
              </div>
            )}

            {results.status === 'passed' && (
              <div className="p-6 bg-green-900/20 border border-green-700 rounded-lg">
                <h3 className="text-xl font-bold text-green-400 mb-2">✅ All Tests Passed!</h3>
                <p className="text-green-300">
                  Mail account provisioning is properly configured. New users will automatically
                  receive mailboxes when they sign up.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
