'use client'
import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useFetch } from '@/hooks/useFetch'
import { createProject, addContribution, deleteProject, updateProject } from '@/lib/api'
import type { Project } from '@/lib/types'
import ProjectCard from '@/components/ProjectCard'
import EmptyState from '@/components/ui/EmptyState'

export default function ProjectsPage() {
  const { data: projects, loading, refetch } = useFetch<Project[]>('/api/projects')
  const [showAdd, setShowAdd] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [contribution, setContribution] = useState({ amount: '', note: '' })
  const [form, setForm] = useState({ name: '', description: '', target_amount: '', deadline: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState('')

  async function handleAddProject(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true)
    setFormError('')
    try {
      await createProject({
        name: form.name,
        description: form.description || undefined,
        target_amount: parseFloat(form.target_amount),
        deadline: form.deadline || undefined,
      } as Parameters<typeof createProject>[0])
      setShowAdd(false)
      setForm({ name: '', description: '', target_amount: '', deadline: '' })
      refetch()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setFormLoading(false)
    }
  }

  async function handleContribution(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedProject) return
    await addContribution(selectedProject.id, {
      amount: parseFloat(contribution.amount),
      note: contribution.note || undefined,
    })
    setSelectedProject(null)
    setContribution({ amount: '', note: '' })
    refetch()
  }

  async function handleToggleStatus(project: Project) {
    const newStatus = project.status === 'active' ? 'paused' : 'active'
    await updateProject(project.id, { status: newStatus })
    refetch()
  }

  const btnStyle = { background: 'linear-gradient(135deg, #e879f9, #818cf8)' }
  const active = (projects || []).filter(p => p.status === 'active')
  const others = (projects || []).filter(p => p.status !== 'active')

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-[#fafafa]">Projets d&apos;épargne</h1>
        <button onClick={() => setShowAdd(true)} className="p-2 rounded-xl text-white" style={btnStyle}>
          <Plus size={20} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => <div key={i} className="h-28 bg-[#18181b] rounded-2xl animate-pulse" />)}
        </div>
      ) : !projects?.length ? (
        <EmptyState icon="🎯" title="Aucun projet" description="Créez un objectif d'épargne commun" />
      ) : (
        <div className="space-y-5">
          {active.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">En cours</p>
              <div className="space-y-3">
                {active.map(p => (
                  <div key={p.id}>
                    <ProjectCard project={p} />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setSelectedProject(p)} className="flex-1 h-9 rounded-xl text-xs font-medium text-white" style={btnStyle}>
                        Contribuer
                      </button>
                      <button onClick={() => handleToggleStatus(p)} className="px-3 h-9 rounded-xl text-xs bg-[#27272a] text-[#a1a1aa]">
                        Pause
                      </button>
                      <button onClick={async () => { if (confirm('Supprimer ?')) { await deleteProject(p.id); refetch() } }} className="p-2 rounded-xl bg-[#ef4444]/10 text-[#ef4444]">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {others.length > 0 && (
            <section>
              <p className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Autres</p>
              <div className="space-y-3">
                {others.map(p => (
                  <div key={p.id}>
                    <ProjectCard project={p} />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => handleToggleStatus(p)} className="flex-1 h-9 rounded-xl text-xs font-medium bg-[#27272a] text-[#a1a1aa]">
                        {p.status === 'paused' ? 'Reprendre' : 'Réactiver'}
                      </button>
                      <button onClick={async () => { if (confirm('Supprimer ?')) { await deleteProject(p.id); refetch() } }} className="p-2 rounded-xl bg-[#ef4444]/10 text-[#ef4444]">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal nouveau projet */}
      {showAdd && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#fafafa] mb-4">Nouveau projet</h3>
            <form onSubmit={handleAddProject} className="space-y-3">
              <input placeholder="Nom du projet (ex: Vacances été)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input placeholder="Description (optionnel)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              <input type="number" inputMode="decimal" placeholder="Objectif ($)" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: e.target.value })} required />
              <div>
                <label className="text-xs text-[#a1a1aa] mb-1 block">Date limite (optionnel)</label>
                <input type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
              </div>
              {formError && <p className="text-[#ef4444] text-sm bg-[#ef4444]/10 rounded-xl p-3">{formError}</p>}
              <button type="submit" disabled={formLoading} className="w-full h-12 rounded-xl font-semibold text-white disabled:opacity-60" style={btnStyle}>
                {formLoading ? 'Création...' : 'Créer'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal contribution */}
      {selectedProject && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/60" onClick={() => setSelectedProject(null)}>
          <div className="w-full max-w-lg mx-auto bg-[#18181b] rounded-t-3xl p-6 border-t border-[#3f3f46]" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-[#fafafa] mb-1">Contribuer</h3>
            <p className="text-sm text-[#a1a1aa] mb-4">{selectedProject.name}</p>
            <form onSubmit={handleContribution} className="space-y-3">
              <input type="number" inputMode="decimal" placeholder="Montant ($)" value={contribution.amount} onChange={e => setContribution({ ...contribution, amount: e.target.value })} required />
              <input placeholder="Note (optionnel)" value={contribution.note} onChange={e => setContribution({ ...contribution, note: e.target.value })} />
              <button type="submit" className="w-full h-12 rounded-xl font-semibold text-white" style={btnStyle}>Ajouter</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
