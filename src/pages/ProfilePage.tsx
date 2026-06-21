import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar } from '../components/AppBar';
import { Avatar } from '../components/Avatar';
import { SectionHeader } from '../components/atoms';
import { Seo } from '../components/Seo';
import { api, type ProfilePatch, type User } from '../lib/api';
import { useAuth } from '../lib/auth';

const PLAN_LABEL: Record<User['plan'], string> = {
  free: 'Free',
  pro: 'Pro',
  founders: 'Founders',
};

export function ProfilePage() {
  const { user, refresh } = useAuth();
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ['public-settings'],
    queryFn: () => api.publicSettings(),
    staleTime: 5 * 60_000,
  });
  const affiliatesEnabled = settingsQ.data?.affiliate_program_enabled ?? false;

  const [name, setName] = useState(user?.name ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Sync local state when user info refreshes (avatar upload, etc.).
  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setBio(user.bio ?? '');
    setPhone(user.phone ?? '');
  }, [user?.id, user?.avatar_url]);

  const onUserUpdated = () => {
    refresh();
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const patchProfile = useMutation({
    mutationFn: (body: ProfilePatch) => api.patchMe(body),
    onSuccess: () => {
      setSaved(true);
      setError(null);
      onUserUpdated();
      setTimeout(() => setSaved(false), 1800);
    },
    onError: (e: Error) => setError(e.message),
  });

  const uploadAvatar = useMutation({
    mutationFn: (dataUrl: string) => api.uploadAvatar(dataUrl),
    onSuccess: () => {
      setUploadError(null);
      onUserUpdated();
    },
    onError: (e: Error) => setUploadError(e.message),
  });

  const removeAvatar = useMutation({
    mutationFn: () => api.deleteAvatar(),
    onSuccess: () => onUserUpdated(),
  });

  if (!user) return null;

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setUploadError('Avatar precisa ter menos de 1 MB.');
      return;
    }
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setUploadError('Use PNG, JPG ou WebP.');
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('falha ao ler arquivo'));
      r.readAsDataURL(file);
    });
    uploadAvatar.mutate(dataUrl);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    patchProfile.mutate({
      name: name.trim() || null,
      bio: bio.trim() || null,
      phone: phone.trim() || null,
    });
  };

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Seo title="Meu perfil" description="Edite seus dados de conta no Jonas Goat." path="/perfil" noindex />
      <AppBar />

      <div style={{ maxWidth: 920, margin: '0 auto', padding: 32 }}>
        <SectionHeader
          eyebrow="Conta"
          title="Meu perfil"
          sub="Atualize seus dados, foto e informações pessoais. Email e plano só podem ser alterados pelo time."
        />

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24, alignItems: 'flex-start' }}>
          {/* Avatar card */}
          <div className="surface" style={{ padding: 24, textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <Avatar user={user} size={120} />
            </div>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
              {user.name || user.email.split('@')[0]}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
              {user.email}
            </div>
            <label
              className="btn btn-edge btn-sm"
              style={{ cursor: 'pointer', justifyContent: 'center', display: 'inline-flex' }}
            >
              {uploadAvatar.isPending ? 'Enviando…' : 'Trocar foto'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onPickFile}
                style={{ display: 'none' }}
              />
            </label>
            {user.avatar_url && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ marginLeft: 8 }}
                onClick={() => removeAvatar.mutate()}
                disabled={removeAvatar.isPending}
              >
                Remover
              </button>
            )}
            {uploadError && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 11,
                  color: 'var(--loss)',
                }}
              >
                {uploadError}
              </div>
            )}
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 16, lineHeight: 1.5 }}>
              PNG, JPG ou WebP até 1 MB. Quadrado fica melhor.
            </p>
          </div>

          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <form onSubmit={submit} className="surface" style={{ padding: 24 }}>
              <div className="t-eyebrow" style={{ marginBottom: 16 }}>Dados pessoais</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <Field label="Email" hint="Não pode ser alterado">
                  <input className="input" value={user.email} readOnly disabled />
                </Field>
                <Field label="Plano">
                  <input className="input" value={PLAN_LABEL[user.plan]} readOnly disabled />
                </Field>
                <Field label="Nome">
                  <input
                    className="input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={120}
                  />
                </Field>
                <Field label="Telefone (opcional)">
                  <input
                    className="input"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    maxLength={40}
                    placeholder="+55 11 98765-4321"
                  />
                </Field>
              </div>

              <Field label="Bio" hint="Aparece no seu perfil público">
                <textarea
                  className="input"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Conta um pouco sobre você"
                  style={{ fontFamily: 'var(--sans)', resize: 'vertical' }}
                />
              </Field>

              {error && (
                <div
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    background: 'oklch(0.68 0.16 25 / 0.1)',
                    border: '1px solid oklch(0.68 0.16 25 / 0.3)',
                    color: 'var(--loss)',
                    fontSize: 12,
                    marginBottom: 12,
                  }}
                >
                  {error}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                <button type="submit" className="btn btn-edge" disabled={patchProfile.isPending}>
                  {patchProfile.isPending ? 'Salvando…' : 'Salvar alterações'}
                </button>
                {saved && <span style={{ color: 'var(--edge)', fontSize: 13 }}>✓ salvo</span>}
              </div>
            </form>

            {affiliatesEnabled && (
              <div className="surface" style={{ padding: 24 }}>
                <div className="t-eyebrow" style={{ marginBottom: 12 }}>Programa de afiliados</div>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>
                  Seu código:{' '}
                  <strong style={{ fontFamily: 'var(--mono)' }}>{user.affiliate_code}</strong>
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  Comissão atual:{' '}
                  <strong style={{ color: 'var(--edge)' }}>
                    {user.affiliate_pct_override ?? '—'}%
                  </strong>{' '}
                  (use o link da página{' '}
                  <a href="/afiliados" style={{ color: 'var(--edge)' }}>
                    Afiliados
                  </a>{' '}
                  para gerenciar).
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: Readonly<{ label: string; hint?: string; children: React.ReactNode }>) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
      <span className="t-eyebrow">{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--muted)' }}>{hint}</span>}
    </label>
  );
}
