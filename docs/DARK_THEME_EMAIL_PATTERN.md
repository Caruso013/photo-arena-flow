# 🎨 Dark Theme Pattern - STA Fotos Emails

## 🎯 Padrão Visual Moderno

### 📐 Cores Principais:

```css
/* Background Principal */
#0a0a0a - Body background (preto profundo)
#1a1a1a - Content background (cinza muito escuro)
#2d2d2d - Boxes/Cards background (cinza escuro)

/* Texto */
#e5e5e5 - Texto principal (branco suave)
#d4d4d4 - Texto secundário (cinza claro)
#a3a3a3 - Texto terciário/hints (cinza médio)
#737373 - Texto footer (cinza)

/* Dourado STA */
#e6b800 - Dourado principal (títulos, CTAs)
#fbbf24 - Dourado claro (highlights)
#d4a700 - Dourado escuro (hover)

/* Bordas */
#404040 - Bordas sutis
#262626 - Bordas footer
```

---

## 📧 Template Base (Copiar e Adaptar)

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #e5e5e5; max-width: 600px; margin: 0 auto; padding: 0; background: #0a0a0a;">
    
    <!-- 🎯 HEADER -->
    <div style="background: linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%); padding: 40px 20px; text-align: center; border-bottom: 2px solid #e6b800;">
      <img src="https://www.stafotos.com/lovable-uploads/6fdfc5d2-230c-4142-bf7c-3a326e5e45a8.png" alt="STA Fotos" style="height: 60px; margin-bottom: 20px;">
      <h1 style="color: #e6b800; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 2px 4px rgba(230, 184, 0, 0.3);">
        [TÍTULO DO EMAIL] 🎉
      </h1>
      <p style="color: #a3a3a3; margin: 10px 0 0 0; font-size: 14px;">
        [Subtítulo opcional]
      </p>
    </div>
    
    <!-- 📝 BODY -->
    <div style="padding: 40px 30px; background: #1a1a1a;">
      <p style="font-size: 16px; margin-bottom: 20px; color: #e5e5e5;">
        Olá <strong style="color: #e6b800;">[NOME]</strong>,
      </p>
      
      <p style="font-size: 16px; margin-bottom: 30px; color: #d4d4d4;">
        [Texto principal do email]
      </p>

      <!-- 📦 BOX DE CONTEÚDO -->
      <div style="background: #2d2d2d; padding: 25px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #404040; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);">
        <h2 style="color: #e6b800; margin-top: 0; font-size: 20px; font-weight: bold;">
          📊 [Título da Seção]
        </h2>
        <p style="margin: 8px 0; color: #d4d4d4;">
          <strong>Campo:</strong> <span style="color: #e6b800; font-size: 18px;">Valor</span>
        </p>
      </div>

      <!-- 🎯 BOTÃO CTA -->
      <div style="text-align: center; margin: 40px 0;">
        <a href="https://www.stafotos.com/[LINK]" 
           style="display: inline-block; padding: 16px 48px; background: linear-gradient(135deg, #e6b800 0%, #d4a700 100%); color: #0d0d0d; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 12px rgba(230, 184, 0, 0.4);">
          [TEXTO DO BOTÃO]
        </a>
      </div>

      <!-- ⚠️ BOX DE AVISO (opcional) -->
      <div style="background: #2d2d0d; border-left: 4px solid #e6b800; padding: 20px; margin-top: 30px; border-radius: 8px;">
        <p style="font-size: 14px; color: #e5e5e5; margin: 0;">
          <strong style="color: #fbbf24;">💡 Dica:</strong> [Texto da dica]
        </p>
      </div>

      <!-- ✅ BOX DE SUCESSO (verde) -->
      <div style="background: #1a2e1a; border-left: 4px solid #28a745; padding: 20px; margin-top: 30px; border-radius: 8px;">
        <p style="font-size: 14px; color: #e5e5e5; margin: 0;">
          <strong style="color: #4ade80;">✅ Sucesso:</strong> [Texto de sucesso]
        </p>
      </div>

      <!-- ⚠️ BOX DE ALERTA (amarelo) -->
      <div style="background: #2d2a1a; border-left: 4px solid #ffc107; padding: 20px; margin-top: 30px; border-radius: 8px;">
        <p style="font-size: 14px; color: #e5e5e5; margin: 0;">
          <strong style="color: #fbbf24;">⚠️ Atenção:</strong> [Texto de alerta]
        </p>
      </div>

      <!-- ❌ BOX DE ERRO (vermelho) -->
      <div style="background: #2e1a1a; border-left: 4px solid #dc2626; padding: 20px; margin-top: 30px; border-radius: 8px;">
        <p style="font-size: 14px; color: #e5e5e5; margin: 0;">
          <strong style="color: #f87171;">❌ Importante:</strong> [Texto de erro/importante]
        </p>
      </div>

      <!-- ℹ️ BOX DE INFO (azul) -->
      <div style="background: #1a1f2e; border-left: 4px solid #2196f3; padding: 20px; margin-top: 30px; border-radius: 8px;">
        <p style="font-size: 14px; color: #e5e5e5; margin: 0;">
          <strong style="color: #60a5fa;">ℹ️ Informação:</strong> [Texto informativo]
        </p>
      </div>
    </div>

    <!-- 🦶 FOOTER -->
    <div style="padding: 30px 20px; background: #0d0d0d; color: #a3a3a3; text-align: center; border-top: 1px solid #262626;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #d4d4d4;">
        [Mensagem final]
      </p>
      <p style="margin: 0; font-size: 12px; color: #737373;">
        © 2025 STA Fotos - Todos os direitos reservados
      </p>
      <p style="margin: 15px 0 0 0; font-size: 12px;">
        <a href="https://www.stafotos.com" style="color: #e6b800; text-decoration: none; font-weight: 500;">www.stafotos.com</a>
      </p>
    </div>
  </body>
</html>
```

---

## 🎨 Exemplos de Uso Específico

### 💰 Valores em Destaque (Vendas/Repasses)

```html
<!-- Valor Total (Dourado) -->
<p style="margin: 8px 0; color: #d4d4d4;">
  <strong>Valor total:</strong> 
  <span style="color: #e6b800; font-size: 20px; font-weight: bold;">R$ 150,00</span>
</p>

<!-- Repasse do Fotógrafo (Verde) -->
<p style="margin: 8px 0; color: #d4d4d4;">
  <strong>Seu repasse:</strong> 
  <span style="color: #4ade80; font-size: 20px; font-weight: bold;">R$ 120,00</span>
</p>
```

### 📋 Listas Estilizadas

```html
<ul style="color: #d4d4d4; font-size: 15px; line-height: 2; padding-left: 20px; margin: 15px 0 0 0;">
  <li style="margin-bottom: 10px;">
    <strong style="color: #fbbf24;">📸 Item 1</strong> - Descrição
  </li>
  <li style="margin-bottom: 10px;">
    <strong style="color: #fbbf24;">🛒 Item 2</strong> - Descrição
  </li>
</ul>
```

### 🏷️ Badges/Tags

```html
<!-- Badge de Status (Aprovado) -->
<span style="background: #1a2e1a; color: #4ade80; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; border: 1px solid #28a745;">
  ✓ Aprovado
</span>

<!-- Badge de Status (Pendente) -->
<span style="background: #2d2a1a; color: #fbbf24; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; border: 1px solid #ffc107;">
  ⏳ Pendente
</span>

<!-- Badge de Status (Rejeitado) -->
<span style="background: #2e1a1a; color: #f87171; padding: 6px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; border: 1px solid #dc2626;">
  ✗ Rejeitado
</span>
```

---

## 📱 Responsividade

O design já é responsivo por usar:
- Unidades relativas (%, em)
- max-width: 600px no body
- Padding adequado
- Fonte do sistema

---

## ✅ Checklist de Aplicação

Ao aplicar o dark theme em cada function:

- [ ] Atualizar `body` background para `#0a0a0a`
- [ ] Atualizar header com gradiente `linear-gradient(135deg, #1a1a1a 0%, #0d0d0d 100%)`
- [ ] Atualizar content background para `#1a1a1a`
- [ ] Atualizar boxes para `#2d2d2d` com border `#404040`
- [ ] Atualizar todos os textos para cores claras (#e5e5e5, #d4d4d4)
- [ ] Atualizar botões CTA com gradiente dourado
- [ ] Atualizar footer com border-top `#262626`
- [ ] Adicionar text-shadow nos títulos principais
- [ ] Adicionar box-shadow nos boxes e CTAs
- [ ] Manter cores douradas para highlights (#e6b800, #fbbf24)

---

## 🚀 Deploy

Após atualizar cada function:
1. Copie o código completo
2. Vá no Supabase Dashboard → Edge Functions
3. Clique na function
4. "Deploy new version"
5. Cole o código
6. Deploy!

---

## 📝 Functions a Atualizar

- [x] send-welcome-email ✅ FEITO
- [ ] send-password-reset-email
- [ ] send-sale-notification-email
- [ ] send-purchase-confirmation-email
- [ ] send-payout-approved-email
- [ ] send-new-campaign-email
- [ ] send-application-notification
- [ ] send-email-resend
- [ ] send-photographer-notification
- [ ] send-purchase-confirmation

---

**Pronto para copiar e usar! 🎨✨**
