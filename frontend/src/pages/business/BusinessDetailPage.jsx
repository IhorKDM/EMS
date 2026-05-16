import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import {
  getBusiness, deleteBusiness,
  listSections, createSection, updateSection, deleteSection,
} from '../../api/business'
import { listPositions } from '../../api/positions'
import { formatDate } from '../../lib/utils'
import PageHeader from '../../components/shared/PageHeader'
import StatusBadge from '../../components/shared/StatusBadge'
import ConfirmDialog from '../../components/shared/ConfirmDialog'
import toast from 'react-hot-toast'

export default function BusinessDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [newSection, setNewSection] = useState('')
  const [editingSection, setEditingSection] = useState(null)
  const [editName, setEditName] = useState('')
  const [confirmDeleteBiz, setConfirmDeleteBiz] = useState(false)
  const [confirmSectionId, setConfirmSectionId] = useState(null)

  const { data: business, isLoading } = useQuery({
    queryKey: ['business', id],
    queryFn: () => getBusiness(id),
  })

  const { data: sections } = useQuery({
    queryKey: ['sections', id],
    queryFn: () => listSections(id),
  })

  const { data: positions } = useQuery({
    queryKey: ['positions', id],
    queryFn: () => listPositions(id),
  })

  const addSection = useMutation({
    mutationFn: () => createSection(id, { name: newSection }),
    onSuccess: () => {
      toast.success('Section added')
      qc.invalidateQueries({ queryKey: ['sections', id] })
      setNewSection('')
    },
    onError: () => toast.error('Failed to add section'),
  })

  const editSection = useMutation({
    mutationFn: (sectionId) => updateSection(id, sectionId, { name: editName }),
    onSuccess: () => {
      toast.success('Section updated')
      qc.invalidateQueries({ queryKey: ['sections', id] })
      setEditingSection(null)
    },
    onError: () => toast.error('Failed to update section'),
  })

  const removeSection = useMutation({
    mutationFn: () => deleteSection(id, confirmSectionId),
    onSuccess: () => {
      toast.success('Section deleted')
      qc.invalidateQueries({ queryKey: ['sections', id] })
      setConfirmSectionId(null)
    },
    onError: () => toast.error('Failed to delete section'),
  })

  const removeBusiness = useMutation({
    mutationFn: () => deleteBusiness(id),
    onSuccess: () => {
      toast.success('Business deleted')
      qc.invalidateQueries({ queryKey: ['businesses'] })
      navigate('/business')
    },
    onError: () => toast.error('Failed to delete business'),
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={business?.name}
        backTo="/business"
        actions={
          <button
            onClick={() => navigate(`/business/${id}/edit`)}
            className="btn-secondary"
          >
            <Pencil className="w-4 h-4" /> Edit
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Business info */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Details</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Name</p>
                <p className="text-sm font-medium text-slate-800">{business?.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Type</p>
                <StatusBadge status={business?.type} />
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Created</p>
                <p className="text-sm text-slate-800">{formatDate(business?.created_at)}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => setConfirmDeleteBiz(true)}
            className="btn-danger w-full justify-center"
          >
            <Trash2 className="w-4 h-4" /> Delete Business
          </button>
        </div>

        {/* Sections */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">
            Sections ({sections?.length ?? 0})
          </h3>

          <div className="space-y-2 mb-4">
            {sections?.length ? sections.map(s => (
              <div key={s.id} className="flex items-center gap-2">
                {editingSection === s.id ? (
                  <>
                    <input
                      className="input flex-1 py-1.5 text-sm"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      autoFocus
                    />
                    <button
                      onClick={() => editSection.mutate(s.id)}
                      className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingSection(null)}
                      className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <p className="flex-1 text-sm text-slate-700">{s.name}</p>
                    <button
                      onClick={() => { setEditingSection(s.id); setEditName(s.name) }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmSectionId(s.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            )) : (
              <p className="text-sm text-slate-400">No sections yet</p>
            )}
          </div>

          {/* Add section */}
          <div className="flex gap-2 pt-3 border-t border-slate-100">
            <input
              className="input flex-1 text-sm"
              placeholder="New section name…"
              value={newSection}
              onChange={e => setNewSection(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && newSection.trim() && addSection.mutate()}
            />
            <button
              onClick={() => addSection.mutate()}
              disabled={!newSection.trim() || addSection.isPending}
              className="btn-primary px-3"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Positions */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700">
              Positions ({positions?.length ?? 0})
            </h3>
            <button
              onClick={() => navigate('/positions/new')}
              className="text-xs text-primary-600 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {positions?.length ? positions.map(p => (
              <div
                key={p.id}
                onClick={() => navigate(`/positions/${p.id}/edit`)}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">{p.title}</p>
                  <p className="text-xs text-slate-400">Rank {p.rank}</p>
                </div>
                <StatusBadge status={p.default_pay_type} />
              </div>
            )) : (
              <p className="text-sm text-slate-400">No positions yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete business confirm */}
      <ConfirmDialog
        open={confirmDeleteBiz}
        title="Delete Business"
        description={`Delete "${business?.name}"? All associated data will be lost.`}
        confirmLabel="Delete"
        variant="danger"
        loading={removeBusiness.isPending}
        onConfirm={() => removeBusiness.mutate()}
        onCancel={() => setConfirmDeleteBiz(false)}
      />

      {/* Delete section confirm */}
      <ConfirmDialog
        open={!!confirmSectionId}
        title="Delete Section"
        description="Are you sure you want to delete this section?"
        confirmLabel="Delete"
        variant="danger"
        loading={removeSection.isPending}
        onConfirm={() => removeSection.mutate()}
        onCancel={() => setConfirmSectionId(null)}
      />
    </div>
  )
}