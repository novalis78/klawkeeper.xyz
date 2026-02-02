'use client';

import { useState } from 'react';

export default function MailDiagnosticsPage() {
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runDiagnostics = async () => {
    if (!userId) {
      setError('User ID is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResults(null);

      const response = await fetch(`/api/diagnostics/mail?userId=${encodeURIComponent(userId)}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to run diagnostics');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-blue-800">Mail System Diagnostics</h1>
      
      <div className="mb-8 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r">
        <p className="text-amber-800 font-medium">⚠️ This page is for administrator use only.</p>
        <p className="text-amber-700">It will run comprehensive diagnostics on the mail system.</p>
      </div>

      <div className="mb-6">
        <label className="block text-gray-800 font-medium mb-2">User ID to test:</label>
        <div className="flex">
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter User ID"
            className="flex-grow px-4 py-2 border rounded-l text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={runDiagnostics}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-2 rounded-r font-medium hover:bg-blue-700 disabled:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-700 focus:ring-offset-2"
          >
            {loading ? 'Running...' : 'Run Diagnostics'}
          </button>
        </div>
        {error && (
          <p className="mt-2 text-red-600 font-medium">{error}</p>
        )}
      </div>

      {results && (
        <div className="border rounded-lg overflow-hidden bg-white shadow-md">
          <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
            <h2 className="text-xl font-bold text-blue-800">Diagnostic Results</h2>
            <p className="text-sm text-blue-600">Timestamp: {results.timestamp}</p>
          </div>
          
          <div className="p-6 space-y-8">
            {/* User Information */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">User Information</h3>
              {results.user ? (
                <div className="bg-gray-50 p-4 rounded border">
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="font-semibold text-gray-600">ID:</dt>
                      <dd className="mt-1">{results.user.id}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-600">Email:</dt>
                      <dd className="mt-1">{results.user.email}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-600">Status:</dt>
                      <dd className="mt-1">{results.user.status}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-600">Auth Method:</dt>
                      <dd className="mt-1">{results.user.authMethod}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-600">Key ID:</dt>
                      <dd className="mt-1 break-all">{results.user.keyId}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-600">Fingerprint:</dt>
                      <dd className="mt-1 break-all">{results.user.fingerprint}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded border border-red-200 text-red-800 font-medium">
                  User not found
                </div>
              )}
            </div>
            
            {/* Mail Account */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">Mail Account</h3>
              {results.mailAccount ? (
                <div className="bg-gray-50 p-4 rounded border">
                  <dl className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="font-semibold text-gray-600">ID:</dt>
                      <dd className="mt-1">{results.mailAccount.id}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-600">Email:</dt>
                      <dd className="mt-1">{results.mailAccount.email}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-600">Username:</dt>
                      <dd className="mt-1">{results.mailAccount.username}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-gray-600">Password Hash Type:</dt>
                      <dd className="mt-1 font-mono text-sm">{results.mailAccount.passwordHashType}</dd>
                    </div>
                  </dl>
                </div>
              ) : (
                <div className="bg-red-50 p-4 rounded border border-red-200 text-red-800 font-medium">
                  No mail account found
                </div>
              )}
            </div>
            
            {/* Database Connections */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">Database Connections</h3>
              <div className="bg-gray-50 p-4 rounded border">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-32 font-semibold text-gray-600">Main DB:</div>
                    <div>
                      {results.databaseConnections.main ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-32 font-semibold text-gray-600">Mail DB:</div>
                    <div>
                      {results.databaseConnections.mail ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Connected
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Failed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Mail Server */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">Mail Server</h3>
              <div className="bg-gray-50 p-4 rounded border">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-40 font-semibold text-gray-600">Connection:</div>
                    <div>
                      {results.mailServer.connection ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Available
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="w-40 font-semibold text-gray-600">Dovecot Running:</div>
                    <div>
                      {results.mailServer.dovecotRunning ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                          No
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* IMAP Tests */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">IMAP Connection Tests</h3>
              <div className="bg-gray-50 rounded border overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Method</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Result</th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Details</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.imapTests.length > 0 ? (
                      results.imapTests.map((test, index) => (
                        <tr key={index} className={test.success ? 'bg-green-50' : ''}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{test.method}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {test.success ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Success
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700">
                            {test.success ? (
                              test.inbox ? (
                                <span>Inbox found with {test.inbox.exists} messages</span>
                              ) : (
                                <span>Connected but could not open INBOX</span>
                              )
                            ) : (
                              <span className="text-red-600 break-all">{test.error}</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-6 py-4 text-sm text-gray-500 text-center">
                          No IMAP tests ran
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Environment Info */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">Environment</h3>
              <div className="bg-gray-50 p-4 rounded border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Object.entries(results.environment).map(([key, value]) => (
                    <div key={key} className="flex">
                      <div className="w-48 font-semibold text-gray-600">{key}:</div>
                      <div className="flex-1 text-gray-900 font-mono text-sm">{value?.toString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Conclusion */}
            <div>
              <h3 className="text-lg font-bold mb-3 text-gray-800 border-b pb-2">Conclusion</h3>
              <div className={`p-4 rounded border ${results.conclusion.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <p className={`text-lg font-bold mb-3 ${results.conclusion.success ? 'text-green-800' : 'text-red-800'}`}>
                  {results.conclusion.success ? '✅ Tests passed successfully!' : '❌ Issues detected'}
                </p>
                
                {results.conclusion.issues.length > 0 && (
                  <div className="mb-4">
                    <p className="font-semibold mb-2 text-gray-800">Issues:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {results.conclusion.issues.map((issue, idx) => (
                        <li key={idx} className="text-red-700">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {results.conclusion.recommendations.length > 0 && (
                  <div>
                    <p className="font-semibold mb-2 text-gray-800">Recommendations:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {results.conclusion.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            
            {/* Troubleshooting Help */}
            <div className="bg-blue-50 p-4 rounded border border-blue-200">
              <h3 className="text-md font-bold mb-2 text-blue-800">Need Help Troubleshooting?</h3>
              <p className="text-blue-700 mb-2">If you're having issues with mail connections, check these common problems:</p>
              <ul className="list-disc pl-5 space-y-1 text-blue-700">
                <li>Ensure Dovecot is running on the server</li>
                <li>Check that port 993 is open for IMAP connections</li>
                <li>Verify the password hash in the virtual_users table has the correct format</li>
                <li>Check Dovecot logs for authentication failures: <code className="bg-blue-100 px-1 py-0.5 rounded">tail -f /var/log/mail.log</code></li>
                <li>Ensure the password derivation method is consistent between signup and login</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}