import * as LocalAuthentication from 'expo-local-authentication'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, Text, View } from 'react-native'
import { useAuth } from '~/context/AuthProvider'
import { usePreferencias } from '~/context/Preferencias'
import { criarEstilos, f, useTema } from '~/theme'
import { Marca } from './Acesso'
import { Botao } from './ui'

/** Tempo fora do app que volta a pedir a digital. */
const TOLERANCIA_MS = 60_000

/** Confere se o aparelho tem digital/rosto cadastrado. */
export async function biometriaDisponivel() {
  return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())
}

export async function autenticar(motivo = 'Desbloquear o MoneyControl') {
  const r = await LocalAuthentication.authenticateAsync({ promptMessage: motivo, cancelLabel: 'Cancelar' })
  return r.success
}

/**
 * Cobre o app até a digital ser confirmada: ao abrir e ao voltar depois de
 * 1 minuto fora. Só age com "Desbloquear com digital" ligado em Configurações.
 */
export function Bloqueio() {
  const { biometria } = usePreferencias()
  const { sair } = useAuth()
  const { cores } = useTema()
  const st = useSt()
  const [bloqueado, setBloqueado] = useState(biometria)
  const [erro, setErro] = useState<string | null>(null)
  const saiuEm = useRef<number | null>(null)
  const pedindo = useRef(false)

  const desbloquear = useCallback(async () => {
    if (pedindo.current) return
    pedindo.current = true
    setErro(null)
    try {
      if (await autenticar()) setBloqueado(false)
      else setErro('Não foi possível confirmar. Tente de novo.')
    } finally {
      pedindo.current = false
    }
  }, [])

  useEffect(() => {
    if (!biometria) return
    const sub = AppState.addEventListener('change', (estado) => {
      if (estado === 'background') saiuEm.current = Date.now()
      if (estado === 'active' && saiuEm.current && Date.now() - saiuEm.current > TOLERANCIA_MS) setBloqueado(true)
    })
    return () => sub.remove()
  }, [biometria])

  // com a opção desligada nunca cobre a tela
  const ativo = bloqueado && biometria

  useEffect(() => {
    if (ativo) desbloquear()
  }, [ativo, desbloquear])

  if (!ativo) return null

  return (
    <View style={st.capa} accessibilityViewIsModal>
      <Marca tamanho={72} />
      <Text style={st.titulo}>MoneyControl bloqueado</Text>
      <Text style={st.texto}>Use a digital ou o bloqueio de tela do celular para ver suas finanças.</Text>
      {erro ? <Text style={[st.texto, { color: cores.perigo }]}>{erro}</Text> : null}
      <View style={{ alignSelf: 'stretch', gap: 8, marginTop: 12 }}>
        <Botao icone="finger-print" onPress={desbloquear}>Desbloquear</Botao>
        <Botao variante="texto" onPress={() => sair()}>Sair da conta</Botao>
      </View>
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  capa: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: cores.fundo,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 10,
  },
  titulo: { fontSize: 22, ...f[800], color: cores.texto1, marginTop: 12 },
  texto: { fontSize: 14, ...f[400], color: cores.texto2, textAlign: 'center', lineHeight: 20 },
}))
