'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import {
  ShieldCheckIcon,
  EnvelopeIcon,
  CalendarIcon,
  CheckCircleIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  KeyIcon,
  UserPlusIcon,
  GlobeAltIcon,
  XMarkIcon,
  ClipboardDocumentIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon
} from '@heroicons/react/24/outline';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showKeyserverSearch, setShowKeyserverSearch] = useState(false);
  const [selectedContact, setSelectedContact] = useState(null);
  const router = useRouter();

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('/api/contacts', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch contacts');
      }

      const data = await response.json();
      setContacts(data.contacts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredContacts = contacts.filter(contact => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      contact.email?.toLowerCase().includes(query) ||
      contact.name?.toLowerCase().includes(query) ||
      contact.key_id?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getSourceBadge = (source) => {
    const badges = {
      attachment: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', label: 'Email' },
      keyserver: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', label: 'Keyserver' },
      manual: { color: 'bg-green-500/20 text-green-400 border-green-500/30', label: 'Manual' },
      registration: { color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', label: 'System' },
      sent: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/30', label: 'Sent' }
    };
    return badges[source] || badges.manual;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts by name, email, or key ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={fetchContacts}
              className="p-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowKeyserverSearch(true)}
              className="inline-flex items-center gap-2 px-4 py-3 bg-purple-600/20 border border-purple-500/30 rounded-xl text-purple-400 hover:bg-purple-600/30 transition-colors"
            >
              <GlobeAltIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Search Keyservers</span>
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl text-white font-medium transition-colors"
            >
              <UserPlusIcon className="h-5 w-5" />
              <span className="hidden sm:inline">Add Contact</span>
            </button>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{contacts.length}</p>
            <p className="text-sm text-gray-400">Total Contacts</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-400">{contacts.filter(c => c.verified).length}</p>
            <p className="text-sm text-gray-400">Verified Keys</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-400">{contacts.filter(c => c.source === 'attachment').length}</p>
            <p className="text-sm text-gray-400">From Emails</p>
          </div>
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-2xl font-bold text-purple-400">{contacts.filter(c => c.source === 'keyserver').length}</p>
            <p className="text-sm text-gray-400">From Keyservers</p>
          </div>
        </div>

        {/* Contact List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-xl">
            Error: {error}
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-12 text-center">
            <KeyIcon className="mx-auto h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-white mb-2">
              {searchQuery ? 'No contacts found' : 'No contacts yet'}
            </h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'Add contacts manually, search keyservers, or receive emails with PGP keys attached'}
            </p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setShowKeyserverSearch(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600/20 border border-purple-500/30 rounded-lg text-purple-400 hover:bg-purple-600/30 transition-colors"
              >
                <GlobeAltIcon className="h-5 w-5" />
                Search Keyservers
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-white transition-colors"
              >
                <UserPlusIcon className="h-5 w-5" />
                Add Contact
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                onSelect={() => setSelectedContact(contact)}
                onCompose={() => router.push(`/dashboard/compose?to=${encodeURIComponent(contact.email)}`)}
                formatDate={formatDate}
                getSourceBadge={getSourceBadge}
              />
            ))}
          </div>
        )}

        {/* Add Contact Modal */}
        {showAddModal && (
          <AddContactModal
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              fetchContacts();
            }}
          />
        )}

        {/* Keyserver Search Modal */}
        {showKeyserverSearch && (
          <KeyserverSearchModal
            onClose={() => setShowKeyserverSearch(false)}
            onImport={() => {
              setShowKeyserverSearch(false);
              fetchContacts();
            }}
          />
        )}

        {/* Contact Detail Modal */}
        {selectedContact && (
          <ContactDetailModal
            contact={selectedContact}
            onClose={() => setSelectedContact(null)}
            onUpdate={() => {
              setSelectedContact(null);
              fetchContacts();
            }}
            onCompose={() => router.push(`/dashboard/compose?to=${encodeURIComponent(selectedContact.email)}`)}
            formatDate={formatDate}
            getSourceBadge={getSourceBadge}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

// Contact Card Component
function ContactCard({ contact, onSelect, onCompose, formatDate, getSourceBadge }) {
  const badge = getSourceBadge(contact.source);

  return (
    <div
      className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-5 hover:bg-gray-800/70 hover:border-gray-600 transition-all cursor-pointer group"
      onClick={onSelect}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
            {(contact.name || contact.email).charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-medium text-white group-hover:text-primary-400 transition-colors">
              {contact.name || contact.email.split('@')[0]}
            </h3>
            <p className="text-sm text-gray-400">{contact.email}</p>
          </div>
        </div>
        {contact.verified && (
          <CheckCircleIcon className="h-5 w-5 text-green-400 flex-shrink-0" title="Verified" />
        )}
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-400">
          <KeyIcon className="h-4 w-4 mr-2 text-primary-400" />
          <span className="font-mono text-xs">{contact.key_id || 'No key'}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span className="flex items-center">
            <CalendarIcon className="h-4 w-4 mr-2 text-primary-400" />
            {formatDate(contact.created_at)}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-xs border ${badge.color}`}>
            {badge.label}
          </span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onCompose();
        }}
        className="w-full py-2.5 bg-primary-600/20 border border-primary-500/30 text-primary-400 rounded-lg hover:bg-primary-600/30 transition-colors text-sm font-medium"
      >
        Send Encrypted Email
      </button>
    </div>
  );
}

// Add Contact Modal
function AddContactModal({ onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    publicKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [keyInfo, setKeyInfo] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, publicKey: event.target.result });
        parseKeyInfo(event.target.result);
      };
      reader.readAsText(file);
    }
  };

  const parseKeyInfo = async (keyText) => {
    try {
      const response = await fetch('/api/contacts/parse-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ publicKey: keyText })
      });

      if (response.ok) {
        const data = await response.json();
        setKeyInfo(data);
        // Auto-fill email if found in key
        if (data.email && !formData.email) {
          setFormData(f => ({ ...f, email: data.email }));
        }
        if (data.name && !formData.name) {
          setFormData(f => ({ ...f, name: data.name }));
        }
      }
    } catch (err) {
      console.error('Error parsing key:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/contacts/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          publicKey: formData.publicKey,
          source: 'manual'
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create contact');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Add Contact</h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Email Address *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="contact@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Name (Optional)</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">PGP Public Key</label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 border-2 border-dashed border-gray-700 rounded-lg text-gray-400 hover:border-primary-500 hover:text-primary-400 transition-colors"
              >
                <ArrowUpTrayIcon className="h-8 w-8 mx-auto mb-2" />
                <span>Click to upload .asc or .gpg file</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".asc,.gpg,.pub,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />

              <div className="text-center text-gray-500 text-sm">or paste key below</div>

              <textarea
                value={formData.publicKey}
                onChange={(e) => {
                  setFormData({ ...formData, publicKey: e.target.value });
                  if (e.target.value.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----')) {
                    parseKeyInfo(e.target.value);
                  }
                }}
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent font-mono text-xs"
                placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----&#10;...&#10;-----END PGP PUBLIC KEY BLOCK-----"
              />
            </div>

            {keyInfo && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4" />
                  Valid PGP key detected
                </p>
                <p className="text-xs text-gray-400 mt-1">Key ID: {keyInfo.keyId}</p>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-800 border border-gray-700 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.email}
              className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding...' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Keyserver Search Modal
function KeyserverSearchModal({ onClose, onImport }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [importing, setImporting] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await fetch('/api/contacts/keyserver-search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ query: query.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Search failed');
      }

      setResults(data.results || []);
      if (data.results?.length === 0) {
        setError('No keys found. Try searching by email address or key ID.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (result) => {
    setImporting(result.keyId);

    try {
      const response = await fetch('/api/contacts/import-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          keyId: result.keyId,
          email: result.email,
          name: result.name,
          publicKey: result.publicKey
        })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Import failed');
      }

      onImport();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <GlobeAltIcon className="h-6 w-6 text-purple-400" />
              Search PGP Keyservers
            </h2>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by email address or key ID..."
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </form>

          <p className="text-xs text-gray-500 mt-2">
            Searches keys.openpgp.org, keyserver.ubuntu.com, and other public keyservers
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && !results.length && (
            <div className="bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {results.length === 0 && !loading && !error && (
            <div className="text-center py-12 text-gray-400">
              <GlobeAltIcon className="h-12 w-12 mx-auto mb-4 text-gray-600" />
              <p>Enter an email address or key ID to search</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400 mb-4">Found {results.length} key(s)</p>
              {results.map((result, index) => (
                <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-white">{result.name || result.email}</h3>
                      <p className="text-sm text-gray-400">{result.email}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">Key ID: {result.keyId}</p>
                      {result.created && (
                        <p className="text-xs text-gray-500 mt-1">Created: {new Date(result.created).toLocaleDateString()}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleImport(result)}
                      disabled={importing === result.keyId}
                      className="px-4 py-2 bg-green-600/20 border border-green-500/30 text-green-400 rounded-lg hover:bg-green-600/30 transition-colors disabled:opacity-50 text-sm"
                    >
                      {importing === result.keyId ? 'Importing...' : 'Import Key'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Contact Detail Modal
function ContactDetailModal({ contact, onClose, onUpdate, onCompose, formatDate, getSourceBadge }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(contact.name || '');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const badge = getSourceBadge(contact.source);

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/contacts/update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({
          id: contact.id,
          name: name
        })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error updating contact:', err);
    } finally {
      setLoading(false);
      setEditing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      const response = await fetch('/api/contacts/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        },
        body: JSON.stringify({ id: contact.id })
      });

      if (response.ok) {
        onUpdate();
      }
    } catch (err) {
      console.error('Error deleting contact:', err);
    }
  };

  const copyKey = () => {
    if (contact.public_key) {
      navigator.clipboard.writeText(contact.public_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 bg-gradient-to-br from-primary-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {(contact.name || contact.email).charAt(0).toUpperCase()}
              </div>
              <div>
                {editing ? (
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white"
                    autoFocus
                  />
                ) : (
                  <h2 className="text-xl font-semibold text-white">
                    {contact.name || contact.email.split('@')[0]}
                  </h2>
                )}
                <p className="text-gray-400">{contact.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase">Key ID</p>
              <p className="text-sm font-mono text-white">{contact.key_id || 'N/A'}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase">Source</p>
              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${badge.color}`}>
                {badge.label}
              </span>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase">Added</p>
              <p className="text-sm text-white">{formatDate(contact.created_at)}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase">Last Used</p>
              <p className="text-sm text-white">{formatDate(contact.last_used)}</p>
            </div>
          </div>

          {contact.fingerprint && (
            <div className="bg-gray-800/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase mb-1">Fingerprint</p>
              <p className="text-xs font-mono text-white break-all">{contact.fingerprint}</p>
            </div>
          )}

          <div className="flex items-center gap-2">
            {contact.verified && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                <CheckCircleIcon className="h-3 w-3" />
                Verified
              </span>
            )}
            {contact.trusted && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs">
                <ShieldCheckIcon className="h-3 w-3" />
                Trusted
              </span>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-gray-700 flex flex-wrap gap-3">
          <button
            onClick={onCompose}
            className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg transition-colors"
          >
            Send Email
          </button>
          <button
            onClick={copyKey}
            disabled={!contact.public_key}
            className="p-2.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors disabled:opacity-50"
            title="Copy public key"
          >
            {copied ? <CheckIcon className="h-5 w-5 text-green-400" /> : <ClipboardDocumentIcon className="h-5 w-5" />}
          </button>
          <button
            onClick={() => setEditing(!editing)}
            className="p-2.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-lg transition-colors"
            title="Edit"
          >
            <PencilIcon className="h-5 w-5" />
          </button>
          <button
            onClick={handleDelete}
            className="p-2.5 bg-gray-800 border border-gray-700 text-red-400 hover:text-red-300 rounded-lg transition-colors"
            title="Delete"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        </div>

        {editing && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={() => setEditing(false)}
              className="flex-1 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
