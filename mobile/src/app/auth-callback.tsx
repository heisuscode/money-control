import { Redirect } from 'expo-router'

// Retorno do login com Google: a sessão é concluída em AuthProvider.entrarComGoogle;
// esta rota só existe para o deep link não cair em "rota não encontrada".
export default function RetornoLogin() {
  return <Redirect href="/" />
}
