'use client';

import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  XCircleIcon, 
  PencilIcon, 
  TrashIcon,
  CheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { getDomain, addAccount, removeAccount } from '@/lib/mail/domains';

export default function EmailAccountsManager({ domainId }) {
  const [domain, setDomain] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newAccount, setNewAccount] = useState({ localPart: '', name: '', isAdmin: false });
  const [editingAccount, setEditingAccount] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Fetch domain data and accounts on component mount
  useEffect(() => {
    if (domainId) {
      fetchDomainData();
    }
  }, [domainId]);

  // Fetch domain data
  const fetchDomainData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const domainData = await getDomain(domainId);
      setDomain(domainData);
      setAccounts(domainData.accounts || []);
    } catch (err) {
      console.error('Error fetching domain data:', err);
      setError('Failed to load domain data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle new account form input changes
  const handleNewAccountChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewAccount({
      ...newAccount,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Handle editing account form input changes
  const handleEditAccountChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingAccount({
      ...editingAccount,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Add a new email account
  const handleAddAccount = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const fullEmail = `${newAccount.localPart}@${domain.domain}`;
      
      // Validate input
      if (!newAccount.localPart) {
        throw new Error('Email address is required');
      }
      
      // Check if email already exists
      if (accounts.some(account => account.email === fullEmail)) {
        throw new Error('Email already exists');
      }
      
      const accountData = {
        email: fullEmail,
        name: newAccount.name || newAccount.localPart,
        isAdmin: newAccount.isAdmin
      };
      
      const result = await addAccount(domainId, accountData);
      
      // Update local state
      setAccounts([...accounts, result]);
      setNewAccount({ localPart: '', name: '', isAdmin: false });
      setIsAdding(false);
    } catch (err) {
      console.error('Error adding account:', err);
      setError(err.message || 'Failed to add account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Start editing an account
  const startEditingAccount = (account) => {
    // Extract local part from email
    const localPart = account.email.split('@')[0];
    
    setEditingAccount({
      ...account,
      localPart
    });
  };

  // Cancel editing an account
  const cancelEditingAccount = () => {
    setEditingAccount(null);
  };

  // Save edited account
  const saveEditedAccount = () => {
    // In a real app, you would call an API to update the account
    // For this mock implementation, we'll just update the local state
    
    const updatedAccounts = accounts.map(account => 
      account.email === editingAccount.email
        ? { ...editingAccount, name: editingAccount.name || editingAccount.localPart }
        : account
    );
    
    setAccounts(updatedAccounts);
    setEditingAccount(null);
  };

  // Delete an account
  const handleDeleteAccount = async (email) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await removeAccount(domainId, email);
      
      // Update local state
      setAccounts(accounts.filter(account => account.email !== email));
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Error removing account:', err);
      setError(err.message || 'Failed to remove account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !domain) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 dark:border-gray-600 border-t-primary-600"></div>
        <p className="mt-2 text-gray-500 dark:text-gray-400">Loading accounts...</p>
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md">
        <p className="text-yellow-700 dark:text-yellow-300">
          Please select a domain to manage email accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-medium text-gray-900 dark:text-white">Email Accounts</h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md bg-primary-600 hover:bg-primary-700 text-white"
          >
            <PlusIcon className="-ml-0.5 mr-2 h-4 w-4" />
            Add Account
          </button>
        )}
      </div>
      
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400 dark:text-red-500 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
      
      {/* Add new account form */}
      {isAdding && (
        <div className="mb-6 bg-white dark:bg-gray-800 shadow-sm rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Add New Email Account</h3>
          <form onSubmit={handleAddAccount}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="localPart" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <input
                    type="text"
                    name="localPart"
                    id="localPart"
                    value={newAccount.localPart}
                    onChange={handleNewAccountChange}
                    required
                    className="flex-1 min-w-0 block w-full rounded-none rounded-l-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm"
                    placeholder="username"
                  />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 sm:text-sm">
                    @{domain.domain}
                  </span>
                </div>
              </div>
              
              <div className="sm:col-span-3">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Display Name
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={newAccount.name}
                    onChange={handleNewAccountChange}
                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-2 px-4 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm"
                    placeholder="John Doe"
                  />
                </div>
              </div>
              
              <div className="sm:col-span-6">
                <div className="flex items-center">
                  <input
                    id="isAdmin"
                    name="isAdmin"
                    type="checkbox"
                    checked={newAccount.isAdmin}
                    onChange={handleNewAccountChange}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-500 rounded"
                  />
                  <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Admin account (can manage domain settings)
                  </label>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !newAccount.localPart}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${
                  isLoading || !newAccount.localPart
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 dark:hover:bg-primary-600'
                }`}
              >
                {isLoading ? 'Adding...' : 'Add Account'}
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Email accounts list */}
      {accounts.length === 0 ? (
        <div className="text-center py-8 bg-white dark:bg-gray-800 shadow-sm rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">No email accounts added yet. Add your first account to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Email Address
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Display Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {accounts.map((account) => (
                <tr key={account.email}>
                  {editingAccount && editingAccount.email === account.email ? (
                    // Edit mode
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {account.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          name="name"
                          value={editingAccount.name}
                          onChange={handleEditAccountChange}
                          className="block w-full rounded-md border border-gray-300 dark:border-gray-600 shadow-sm py-1 px-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent sm:text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <input
                            name="isAdmin"
                            type="checkbox"
                            checked={editingAccount.isAdmin}
                            onChange={handleEditAccountChange}
                            className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-500 rounded"
                          />
                          <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            Admin
                          </label>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={saveEditedAccount}
                          className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                        >
                          <CheckIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={cancelEditingAccount}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </td>
                    </>
                  ) : (
                    // View mode
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {account.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {account.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {account.isAdmin ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {showDeleteConfirm === account.email ? (
                          <>
                            <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Confirm delete?</span>
                            <button
                              onClick={() => handleDeleteAccount(account.email)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 mr-2"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(null)}
                              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                            >
                              No
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEditingAccount(account)}
                              className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                            >
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(account.email)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              disabled={account.isAdmin && accounts.filter(a => a.isAdmin).length === 1}
                              title={account.isAdmin && accounts.filter(a => a.isAdmin).length === 1 ? "Cannot delete the last admin account" : ""}
                            >
                              <TrashIcon className={`h-5 w-5 ${account.isAdmin && accounts.filter(a => a.isAdmin).length === 1 ? "opacity-50 cursor-not-allowed" : ""}`} />
                            </button>
                          </>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}