-- Atualizar cupom PROMO20 que expirou para nova data
UPDATE public.coupons 
SET end_date = '2026-02-28 23:59:59+00'::timestamptz,
    updated_at = now()
WHERE code = 'PROMO20';

-- Garantir que admins podem ver todos os emails para liberar fotos
-- A policy "Anyone can view profiles" já permite SELECT para todos
-- mas vamos garantir que o campo email não é NULL nas consultas

-- Adicionar comentário para documentação
COMMENT ON TABLE public.profiles IS 'Tabela de perfis de usuários. Email visível para admins e fotógrafos buscarem clientes para liberar fotos.';