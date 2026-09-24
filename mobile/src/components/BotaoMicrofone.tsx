import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio'
import { File } from 'expo-file-system'
import { fetch as expoFetch } from 'expo/fetch'
import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { lerTranscricao, SEGUNDOS_MAX_AUDIO } from '@/lib/assistente'
import { supabase } from '~/lib/supabase'
import { criarEstilos, f, useTema } from '~/theme'
import { Icone } from './ui'

/**
 * Microfone do assistente: toca para gravar, toca de novo para parar (para
 * sozinho em 1 minuto). O .m4a vai para api/transcrever e o texto volta por
 * `aoTranscrever`, para a pessoa conferir antes de enviar.
 */
export function BotaoMicrofone({
  endereco,
  aoTranscrever,
  aoErro,
  desabilitado,
}: {
  /** URL de api/transcrever */
  endereco: string
  aoTranscrever: (texto: string) => void
  aoErro: (mensagem: string) => void
  desabilitado?: boolean
}) {
  const { cores } = useTema()
  const st = useSt()
  const gravador = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const estado = useAudioRecorderState(gravador, 250)
  const [transcrevendo, setTranscrevendo] = useState(false)
  const limite = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gravando = estado.isRecording
  const segundos = Math.floor((estado.durationMillis ?? 0) / 1000)

  async function parar() {
    if (limite.current) clearTimeout(limite.current)
    limite.current = null
    await gravador.stop()
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
    const uri = gravador.uri
    if (!uri) return aoErro('Não deu para gravar. Tente de novo.')
    setTranscrevendo(true)
    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token
      if (!token) return aoErro('Sua sessão expirou. Entre de novo.')
      const resposta = await expoFetch(endereco, {
        method: 'POST',
        headers: { 'content-type': 'audio/m4a', authorization: `Bearer ${token}` },
        body: new File(uri),
      })
      const r = await lerTranscricao(resposta)
      if (r.texto) aoTranscrever(r.texto)
      else aoErro(r.erro ?? 'Não consegui entender o áudio.')
    } catch {
      aoErro('Sem conexão. Tente de novo ou digite.')
    } finally {
      setTranscrevendo(false)
      // o áudio não fica guardado no aparelho
      try {
        new File(uri).delete()
      } catch {
        /* já foi apagado */
      }
    }
  }

  // saiu da tela: cancela o limite pendente
  useEffect(
    () => () => {
      if (limite.current) clearTimeout(limite.current)
    },
    [],
  )

  async function gravar() {
    const permissao = await AudioModule.requestRecordingPermissionsAsync()
    if (!permissao.granted) {
      return aoErro('Sem permissão do microfone. Libere em Configurações do Android → Apps → Expo Go/MoneyControl.')
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await gravador.prepareToRecordAsync()
    gravador.record()
    // para sozinho em 1 minuto
    limite.current = setTimeout(parar, SEGUNDOS_MAX_AUDIO * 1000)
  }

  return (
    <View style={st.linha}>
      {gravando ? <Text style={st.tempo}>0:{String(segundos).padStart(2, '0')}</Text> : null}
      <Pressable
        onPress={gravando ? parar : gravar}
        disabled={desabilitado || transcrevendo}
        accessibilityRole="button"
        accessibilityLabel={gravando ? 'Parar e transcrever' : transcrevendo ? 'Transcrevendo' : 'Falar em vez de digitar'}
        style={({ pressed }) => [
          st.botao,
          gravando && st.botaoGravando,
          (desabilitado || transcrevendo) && { opacity: 0.5 },
          pressed && { opacity: 0.7 },
        ]}
      >
        {transcrevendo ? (
          <ActivityIndicator color={cores.marcaTexto} />
        ) : (
          <Icone nome={gravando ? 'stop' : 'mic-outline'} tamanho={20} cor={gravando ? '#FFFFFF' : cores.texto2} />
        )}
      </Pressable>
    </View>
  )
}

const useSt = criarEstilos((cores) => ({
  linha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tempo: { fontSize: 13, ...f[700], color: cores.perigo, fontVariant: ['tabular-nums'] },
  botao: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: cores.borda, alignItems: 'center', justifyContent: 'center' },
  botaoGravando: { backgroundColor: cores.perigo, borderColor: cores.perigo },
}))
