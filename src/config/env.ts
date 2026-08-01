// As variáveis são lidas de process.env e nada fica escrito no código.
//
// Elas precisam aparecer literalmente como `process.env.NEXT_PUBLIC_...`: o Next
// substitui essas expressões pelo valor em tempo de build para o código que roda
// no navegador. Uma leitura dinâmica (`process.env[nome]`) não é substituída e
// chegaria como undefined no cliente.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const config = {
  supabase: { url, anonKey },
};

/**
 * Falso quando o ambiente não define as variáveis do Supabase. Nesse caso a tela
 * de login exibe as instruções de configuração e desabilita o formulário, em vez
 * de o app quebrar tentando falar com um servidor que não existe.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);
