'use client';

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import ComposeEmail from '@/components/mail/ComposeEmail';
import { DocumentTextIcon, TrashIcon, PencilSquareIcon } from '@heroicons/react/24/outline';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDraft, setSelectedDraft] = useState(null);
  const [draftLimit, setDraftLimit] = useState(1);
  const [subscriptionStatus, setSubscriptionStatus] = useState('free');

  // Fetch drafts
  const fetchDrafts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/drafts', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch drafts');
      }

      const data = await response.json();
      setDrafts(data.drafts || []);
      setDraftLimit(data.draftLimit || 1);
      setSubscriptionStatus(data.subscriptionStatus || 'free');
    } catch (err) {
      console.error('Error fetching drafts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  // Delete a draft
  const handleDelete = async (draftId) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/drafts/${draftId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete draft');
      }

      // Remove from local state
      setDrafts(drafts.filter(d => d.id !== draftId));
    } catch (err) {
      console.error('Error deleting draft:', err);
      alert('Failed to delete draft');
    }
  };

  // Open a draft for editing
  const handleEdit = async (draftId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`/api/drafts/${draftId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load draft');
      }

      const data = await response.json();
      setSelectedDraft({
        ...data.draft,
        draftId: draftId
      });
    } catch (err) {
      console.error('Error loading draft:', err);
      alert('Failed to load draft');
    }
  };

  // Format date for display
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Handle compose close
  const handleComposeClose = () => {
    setSelectedDraft(null);
    fetchDrafts(); // Refresh the list
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-white">Drafts</h1>
            <p className="text-sm text-gray-400 mt-1">
              {drafts.length} of {draftLimit} drafts used
              {subscriptionStatus === 'free' && drafts.length >= draftLimit && (
                <span className="ml-2 text-amber-400">
                  - Upgrade for more drafts
                </span>
              )}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-300">
            {error}
          </div>
        ) : drafts.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-300 mb-2">No drafts</h3>
            <p className="text-gray-500">
              When you start composing an email, it will automatically save here.
            </p>
          </div>
        ) : (
          <div className="bg-white/[0.03] border border-white/10 rounded-xl overflow-hidden">
            {drafts.map((draft, index) => (
              <div
                key={draft.id}
                className={`flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors ${
                  index !== drafts.length - 1 ? 'border-b border-white/10' : ''
                }`}
              >
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleEdit(draft.id)}>
                  <div className="flex items-center gap-3">
                    <DocumentTextIcon className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {draft.subject || '(No subject)'}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        To: {draft.recipient_to || '(No recipient)'}
                      </p>
                      {draft.body_preview && (
                        <p className="text-xs text-gray-500 truncate mt-1">
                          {draft.body_preview.substring(0, 100)}...
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 ml-4 flex-shrink-0">
                  <span className="text-xs text-gray-500">
                    {formatDate(draft.updated_at)}
                  </span>
                  <button
                    onClick={() => handleEdit(draft.id)}
                    className="p-2 text-gray-400 hover:text-primary-400 hover:bg-white/5 rounded-lg transition-colors"
                    title="Edit draft"
                  >
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors"
                    title="Delete draft"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose modal for editing draft */}
      {selectedDraft && (
        <ComposeEmail
          onClose={handleComposeClose}
          initialData={{
            to: selectedDraft.recipient_to || '',
            cc: selectedDraft.recipient_cc || '',
            bcc: selectedDraft.recipient_bcc || '',
            subject: selectedDraft.subject || '',
            body: selectedDraft.body || '',
            attachments: selectedDraft.attachments || []
          }}
          draftId={selectedDraft.draftId}
          mode="new"
        />
      )}
    </DashboardLayout>
  );
}
