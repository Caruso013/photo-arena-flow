-- Migração: Proteção de ganhos ao excluir álbuns
-- Garante que fotógrafos não percam dinheiro ao excluir álbuns após 12h

-- 1. Impedir exclusão de sub_events (álbuns) se houver compras com repasse pendente
CREATE OR REPLACE FUNCTION prevent_album_deletion_with_pending_payouts()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  pending_sales_count INT;
BEGIN
  -- Contar vendas de fotos do álbum que ainda não foram solicitadas para repasse
  SELECT COUNT(DISTINCT rs.id)
  INTO pending_sales_count
  FROM revenue_shares rs
  INNER JOIN purchases p ON rs.purchase_id = p.id
  INNER JOIN photos ph ON p.photo_id = ph.id
  WHERE ph.sub_event_id = OLD.id
    AND p.status = 'completed'
    AND p.created_at >= (NOW() - INTERVAL '12 hours')
    AND NOT EXISTS (
      SELECT 1 FROM payout_requests pr
      WHERE pr.photographer_id = rs.photographer_id
        AND pr.created_at >= rs.created_at
        AND pr.status IN ('pending', 'approved')
    );

  -- Se houver vendas pendentes, bloquear exclusão
  IF pending_sales_count > 0 THEN
    RAISE EXCEPTION 'Não é possível excluir este álbum pois há % venda(s) com repasse pendente (menos de 12h ou não solicitado)', pending_sales_count;
  END IF;

  RETURN OLD;
END;
$$;

-- Criar trigger para proteger exclusão de álbuns
DROP TRIGGER IF EXISTS protect_album_with_pending_payouts ON sub_events;
CREATE TRIGGER protect_album_with_pending_payouts
  BEFORE DELETE ON sub_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_album_deletion_with_pending_payouts();

-- 2. Ao invés de excluir fotos, marcar como "não disponível" se houver compras
CREATE OR REPLACE FUNCTION soft_delete_photos_with_sales()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  has_sales BOOLEAN;
BEGIN
  -- Verificar se a foto tem vendas
  SELECT EXISTS (
    SELECT 1 FROM purchases
    WHERE photo_id = OLD.id
      AND status = 'completed'
  ) INTO has_sales;

  -- Se tem vendas, apenas marcar como indisponível ao invés de excluir
  IF has_sales THEN
    UPDATE photos
    SET is_available = false,
        updated_at = NOW()
    WHERE id = OLD.id;
    
    -- Impedir a exclusão real
    RAISE EXCEPTION 'Foto com vendas não pode ser excluída. Foi marcada como indisponível.';
  END IF;

  RETURN OLD;
END;
$$;

-- Criar trigger para proteger fotos vendidas
DROP TRIGGER IF EXISTS protect_sold_photos ON photos;
CREATE TRIGGER protect_sold_photos
  BEFORE DELETE ON photos
  FOR EACH ROW
  EXECUTE FUNCTION soft_delete_photos_with_sales();

-- 3. Comentário: Os ganhos permanecem em revenue_shares mesmo se álbum/foto forem excluídos
COMMENT ON TABLE revenue_shares IS 'Tabela de ganhos dos fotógrafos. Os registros permanecem mesmo se álbuns ou fotos forem excluídos, garantindo que o fotógrafo não perca seus ganhos.';