'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, PencilIcon, CheckIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

export default function MailAccountsPage() {
  const [domains, setDomains] = useState([]);
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ domain_id: '', email: '', password: '', name: '', localPart: '', isAdmin: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // In a real implementation, these would be API calls
      // For now, we'll use mock data
      
      // Mock domains data
      const domainsData = [
        { id: 1, name: 'keykeeper.world', status: 'active' },
        { id: 2, name: 'phoneshield.ai', status: 'active' }
      ];
      
      // Mock users data
      const usersData = [
        { id: 1, domain_id: 1, email: 'test@keykeeper.world', name: 'Test Account', isAdmin: true },
        { id: 2, domain_id: 1, email: 'admin@keykeeper.world', name: 'Admin Account', isAdmin: true },
        { id: 3, domain_id: 2, email: 'user@phoneshield.ai', name: 'Phone Shield User', isAdmin: false }
      ];
      
      setDomains(domainsData);
      setUsers(usersData);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'localPart') {
      // Handle local part of email separately
      const domain = domains.find(d => d.id === parseInt(newUser.domain_id));
      if (domain) {
        setNewUser({
          ...newUser,
          localPart: value,
          email: `${value}@${domain.name}`
        });
      } else {
        // No domain selected yet
        setNewUser({
          ...newUser,
          localPart: value
        });
      }
    } else {
      setNewUser({
        ...newUser,
        [name]: type === 'checkbox' ? checked : value
      });
    }
  };
  
  const handleDomainChange = (e) => {
    const domainId = e.target.value;
    const domain = domains.find(d => d.id === parseInt(domainId));
    
    // Use stored localPart if available, otherwise extract from existing email
    const localPart = newUser.localPart || (newUser.email ? newUser.email.split('@')[0] : '');
    
    setNewUser({
      ...newUser,
      domain_id: domainId,
      email: domain && localPart ? `${localPart}@${domain.name}` : ''
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditingUser({
      ...editingUser,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validation with more specific error messages
      if (!newUser.domain_id) {
        throw new Error('Please select a domain');
      }
      
      if (!newUser.email || !newUser.email.includes('@')) {
        throw new Error('Please enter a valid email address');
      }
      
      if (!newUser.password) {
        throw new Error('Password is required');
      }
      
      if (newUser.password.length < 8) {
        throw new Error('Password must be at least 8 characters long');
      }
      
      // In a real implementation, this would be an API call
      // For now, we'll simulate it
      
      // Check if email already exists
      if (users.some(user => user.email === newUser.email)) {
        throw new Error('Email already exists');
      }
      
      // Create new user
      const createdUser = {
        id: users.length + 1,
        domain_id: parseInt(newUser.domain_id),
        email: newUser.email,
        name: newUser.name || newUser.email.split('@')[0],
        isAdmin: newUser.isAdmin || false
      };
      
      setUsers([...users, createdUser]);
      
      // Reset form with cleared values
      setNewUser({ domain_id: '', email: '', password: '', name: '', localPart: '', isAdmin: false });
      
      // Show success message
      setError('Account created successfully!');
      
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const startEditingUser = (user) => {
    setEditingUser({
      ...user
    });
  };

  const cancelEditingUser = () => {
    setEditingUser(null);
  };

  const saveEditedUser = () => {
    setUsers(users.map(user => 
      user.id === editingUser.id ? editingUser : user
    ));
    setEditingUser(null);
  };

  const handleDeleteUser = (userId) => {
    setUsers(users.filter(user => user.id !== userId));
    setShowDeleteConfirm(null);
  };

  // Get domain name by ID
  const getDomainName = (domainId) => {
    const domain = domains.find(d => d.id === domainId);
    return domain ? domain.name : 'Unknown';
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Email Account Management</h1>
      </div>
      
      {error && (
        <div className={`p-4 mb-6 border-l-4 ${
          error === 'Account created successfully!' 
            ? 'bg-green-100 border-green-500 text-green-700' 
            : 'bg-red-100 border-red-500 text-red-700'
        }`}>
          <p>{error}</p>
        </div>
      )}
      
      <div className="grid grid-cols-1 gap-8">
        {/* Existing accounts section (now full width and more prominent) */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Existing Email Accounts</h2>
            <button 
              onClick={() => document.getElementById('create-account-form').classList.toggle('hidden')}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200 dark:text-primary-200 dark:bg-primary-900/20 dark:hover:bg-primary-900/30"
            >
              <PlusIcon className="h-5 w-5 mr-1" />
              New Account
            </button>
          </div>
          
          {loading && users.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">Loading accounts...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No email accounts found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
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
                  {users.map((user) => (
                    <tr key={user.id}>
                      {editingUser && editingUser.id === user.id ? (
                        // Edit mode
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="text"
                              name="name"
                              value={editingUser.name}
                              onChange={handleEditInputChange}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <input
                                name="isAdmin"
                                type="checkbox"
                                checked={editingUser.isAdmin}
                                onChange={handleEditInputChange}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-500 rounded"
                              />
                              <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Admin
                              </label>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={saveEditedUser}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={cancelEditingUser}
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
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.isAdmin ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                                Admin
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                User
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {showDeleteConfirm === user.id ? (
                              <>
                                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Confirm delete?</span>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
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
                                  onClick={() => startEditingUser(user)}
                                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(user.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <TrashIcon className="h-5 w-5" />
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
        
        {/* Create account form (collapsible, hidden by default) */}
        <div id="create-account-form" className="hidden">
          <h2 className="text-xl font-semibold mb-4">Create New Email Account</h2>
          <form onSubmit={handleCreateUser} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Domain
              </label>
              <select
                name="domain_id"
                value={newUser.domain_id}
                onChange={handleDomainChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select a domain</option>
                {domains.map(domain => (
                  <option key={domain.id} value={domain.id}>{domain.name}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="flex">
                <input
                  type="text"
                  name="localPart"
                  placeholder="username"
                  required
                  className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-l-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                />
                <span className="inline-flex items-center px-3 py-2 rounded-r-md border border-l-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 sm:text-sm">
                  @{newUser.domain_id ? getDomainName(parseInt(newUser.domain_id)) : 'domain.com'}
                </span>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                name="name"
                value={newUser.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="John Doe"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={newUser.password}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                placeholder="••••••••"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Password must be at least 8 characters long and include a mix of letters, numbers, and symbols.
              </p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-center">
                <input
                  id="isAdmin"
                  name="isAdmin"
                  type="checkbox"
                  checked={newUser.isAdmin}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-700 rounded"
                />
                <label htmlFor="isAdmin" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Admin account (can manage domain settings)
                </label>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                loading 
                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                  : 'bg-primary-600 hover:bg-primary-700 dark:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
              }`}
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>
        
        <div>
          <h2 className="text-xl font-semibold mb-4">Existing Email Accounts</h2>
          {loading && users.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">Loading accounts...</p>
            </div>
          ) : users.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No email accounts found</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden rounded-lg">
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
                  {users.map((user) => (
                    <tr key={user.id}>
                      {editingUser && editingUser.id === user.id ? (
                        // Edit mode
                        <>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="text"
                              name="name"
                              value={editingUser.name}
                              onChange={handleEditInputChange}
                              className="w-full px-2 py-1 border border-gray-300 dark:border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <input
                                name="isAdmin"
                                type="checkbox"
                                checked={editingUser.isAdmin}
                                onChange={handleEditInputChange}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 dark:border-gray-500 rounded"
                              />
                              <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                Admin
                              </label>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={saveEditedUser}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                            >
                              <CheckIcon className="h-5 w-5" />
                            </button>
                            <button
                              onClick={cancelEditingUser}
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
                            {user.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {user.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.isAdmin ? (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                                Admin
                              </span>
                            ) : (
                              <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                User
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {showDeleteConfirm === user.id ? (
                              <>
                                <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">Confirm delete?</span>
                                <button
                                  onClick={() => handleDeleteUser(user.id)}
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
                                  onClick={() => startEditingUser(user)}
                                  className="text-primary-600 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300 mr-3"
                                >
                                  <PencilIcon className="h-5 w-5" />
                                </button>
                                <button
                                  onClick={() => setShowDeleteConfirm(user.id)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                >
                                  <TrashIcon className="h-5 w-5" />
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
      </div>
    </div>
  );
}