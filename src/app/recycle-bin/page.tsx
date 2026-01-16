/**
 * @fileoverview Recycle Bin Page
 *
 * Displays all deleted records with options to:
 * - Restore deleted records
 * - Permanently delete (purge)
 * - View deletion details
 */

"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, RotateCcw, Trash2, Eye, CheckCircle, XCircle } from 'lucide-react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface DeletedRecord {
  batch_id: string
  schema_name: string
  table_name: string
  record_id: string
  record_name: string
  deleted_at: string
  deleted_by_email: string
  record_count: number
  restored_at: string | null
}

type ModalType = 'restore' | 'purge' | null

export default function RecycleBinPage() {
  const [deletions, setDeletions] = useState<DeletedRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDeletion, setSelectedDeletion] = useState<DeletedRecord | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showModal, setShowModal] = useState<ModalType>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchDeletions()
  }, [])

  const fetchDeletions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .schema('recycle')
        .rpc('get_org_deletions')

      if (error) throw error

      // Group by batch_id to get unique deletions
      const uniqueDeletions = data?.reduce((acc: any[], record: any) => {
        const existing = acc.find(d => d.batch_id === record.batch_id)
        if (!existing) {
          acc.push(record)
        }
        return acc
      }, []) || []

      setDeletions(uniqueDeletions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch deleted records')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (deletionId: string) => {
    try {
      setActionLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .schema('recycle')
        .rpc('restore_deletion', { p_batch_id: deletionId })

      if (error) throw error

      setSuccessMessage(`Successfully restored ${data} record(s)`)
      setShowModal(null)
      fetchDeletions()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setErrorMessage('Failed to restore: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setShowModal(null)
    } finally {
      setActionLoading(false)
    }
  }

  const handlePurge = async (deletionId: string) => {
    try {
      setActionLoading(true)
      setErrorMessage(null)

      const { data, error } = await supabase
        .schema('recycle')
        .rpc('purge_deletion', { p_batch_id: deletionId })

      if (error) throw error

      setSuccessMessage(`Successfully purged ${data} record(s)`)
      setShowModal(null)
      fetchDeletions()

      // Clear success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000)
    } catch (err) {
      setErrorMessage('Failed to purge: ' + (err instanceof Error ? err.message : 'Unknown error'))
      setShowModal(null)
    } finally {
      setActionLoading(false)
    }
  }

  const openRestoreModal = (deletion: DeletedRecord) => {
    setSelectedDeletion(deletion)
    setShowModal('restore')
  }

  const openPurgeModal = (deletion: DeletedRecord) => {
    setSelectedDeletion(deletion)
    setShowModal('purge')
  }

  const closeModal = () => {
    setShowModal(null)
    setSelectedDeletion(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <span className="ml-2 text-gray-600">Loading recycle bin...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error</h3>
          <p className="text-red-600 mt-1">{error}</p>
          <button
            onClick={fetchDeletions}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
          <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
          <p className="text-green-800">{successMessage}</p>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <XCircle className="h-5 w-5 text-red-600 mr-3" />
          <p className="text-red-800">{errorMessage}</p>
          <button
            onClick={() => setErrorMessage(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Recycle Bin</h1>
        <p className="text-gray-600 mt-2">
          Manage and restore deleted records
        </p>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Deletions</div>
          <div className="text-2xl font-bold text-gray-900">{deletions.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Total Records</div>
          <div className="text-2xl font-bold text-gray-900">
            {deletions.reduce((sum, d) => sum + d.record_count, 0)}
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-600">Storage Used</div>
          <div className="text-2xl font-bold text-gray-900">
            {deletions.length > 0 ? '~' + deletions.length + ' MB' : '0 MB'}
          </div>
        </div>
      </div>

      {/* Deletions List */}
      {deletions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Trash2 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Recycle Bin is Empty</h3>
          <p className="text-gray-600">Deleted records will appear here</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Record Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deleted By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deleted At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Records
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {deletions.map((deletion) => (
                <tr key={deletion.batch_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {deletion.schema_name}.{deletion.table_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{deletion.record_name}</div>
                    <div className="text-xs text-gray-400">
                      ID: {deletion.record_id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{deletion.deleted_by_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(deletion.deleted_at).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {deletion.record_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => openRestoreModal(deletion)}
                      disabled={actionLoading}
                      className="text-teal-600 hover:text-teal-900 mr-4 disabled:opacity-50"
                      title="Restore"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => openPurgeModal(deletion)}
                      disabled={actionLoading}
                      className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      title="Delete Permanently"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showModal === 'restore' && selectedDeletion && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-[1px] bg-gray-900/5 cursor-not-allowed">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 cursor-default">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-teal-50 to-white">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                  <RotateCcw className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Restore Records
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedDeletion.schema_name}.{selectedDeletion.table_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-gray-600 text-sm leading-relaxed">
                Are you sure you want to restore <span className="font-semibold text-gray-900">{selectedDeletion.record_count} record(s)</span> from {selectedDeletion.record_name}? The records will be restored to their original location.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-teal-600 bg-white hover:bg-gray-50 border border-teal-600 rounded transition-colors shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRestore(selectedDeletion.batch_id)}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 border border-teal-600 rounded transition-colors shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Restore
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge Confirmation Modal */}
      {showModal === 'purge' && selectedDeletion && (
        <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-[1px] bg-gray-900/5 cursor-not-allowed">
          <div className="bg-white rounded-xl max-w-md w-full mx-4 shadow-2xl border border-gray-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 cursor-default">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-red-50 to-white">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Delete Permanently
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedDeletion.schema_name}.{selectedDeletion.table_name}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5">
              <p className="text-gray-600 text-sm leading-relaxed">
                Are you sure you want to permanently delete <span className="font-semibold text-gray-900">{selectedDeletion.record_count} record(s)</span> from {selectedDeletion.record_name}? This action cannot be undone.
              </p>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
              <button
                onClick={closeModal}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-teal-600 bg-white hover:bg-gray-50 border border-teal-600 rounded transition-colors shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePurge(selectedDeletion.batch_id)}
                disabled={actionLoading}
                className="inline-flex items-center px-3 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 border border-red-600 rounded transition-colors shadow-lg disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
