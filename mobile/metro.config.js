// O app reaproveita as regras de negócio do site (../src): tipos, formatação,
// ciclo de fatura, parcelas, recorrências e operações no Supabase. Assim site e
// app nunca calculam diferente. `@/...` aponta para ../src; `~/...` para ./src.
const path = require('path')
const { getDefaultConfig } = require('expo/metro-config')

const projectRoot = __dirname
const compartilhado = path.resolve(projectRoot, '../src')

const config = getDefaultConfig(projectRoot)

config.watchFolders = [...(config.watchFolders ?? []), compartilhado]
// Dependências do código compartilhado (date-fns etc.) vêm do node_modules do app.
config.resolver.nodeModulesPaths = [path.resolve(projectRoot, 'node_modules')]

const resolverPadrao = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@/')) {
    return context.resolveRequest(context, path.join(compartilhado, moduleName.slice(2)), platform)
  }
  return (resolverPadrao ?? context.resolveRequest)(context, moduleName, platform)
}

module.exports = config
