# Como Configurar um Domínio Customizado no Lovable

Para usar seu próprio domínio (exemplo: seusite.com) ao invés do domínio Lovable padrão, siga estes passos:

## 1. Requisitos
- Você precisa de uma conta Lovable paga (plano Pro ou superior)
- Você deve ter um domínio registrado (pode comprar em: GoDaddy, Namecheap, Registro.br, etc.)

## 2. Configurar no Lovable

1. Acesse as configurações do seu projeto no Lovable
2. Vá em **Project > Settings > Domains**
3. Clique em **Connect Domain**
4. Digite seu domínio (exemplo: meusite.com)

## 3. Configurar DNS no seu Registrador

Lovable irá fornecer os registros DNS que você precisa adicionar. Geralmente são:

### Para domínio raiz (meusite.com):
- **Tipo**: A
- **Nome**: @ (ou deixe em branco)
- **Valor**: 185.158.133.1

### Para subdomínio www (www.meusite.com):
- **Tipo**: A
- **Nome**: www
- **Valor**: 185.158.133.1

## 4. Onde Configurar DNS

Dependendo de onde você comprou seu domínio:

### GoDaddy
1. Faça login no GoDaddy
2. Vá em "Meus Produtos"
3. Clique em "DNS" ao lado do seu domínio
4. Adicione os registros A fornecidos

### Namecheap
1. Faça login no Namecheap
2. Vá em "Domain List"
3. Clique em "Manage" no seu domínio
4. Vá na aba "Advanced DNS"
5. Adicione os registros A

### Registro.br
1. Faça login no Registro.br
2. Vá em "Meus Domínios"
3. Clique no domínio
4. Vá em "DNS"
5. Adicione os registros A

## 5. Aguardar Propagação

- A propagação de DNS pode levar de alguns minutos até 48 horas
- Você pode verificar o status em: https://dnschecker.org
- O SSL (https) será configurado automaticamente pelo Lovable

## 6. Problemas Comuns

### Domínio não verifica após 48 horas
- Verifique se os registros DNS estão corretos
- Remova qualquer registro conflitante (outros A records para @ ou www)
- Use DNSChecker.org para verificar se as mudanças propagaram

### SSL não funciona
- Aguarde até 48 horas após a propagação do DNS
- Verifique se não há registros CAA bloqueando Let's Encrypt
- Certifique-se de que não há registros DNS conflitantes

### Domínio já estava em outro projeto
- Você precisa remover o domínio do projeto antigo primeiro
- Um domínio só pode estar conectado a um projeto Lovable por vez

## 7. Suporte

Se continuar com problemas:
- Entre em contato com o suporte do Lovable
- Envie prints dos seus registros DNS
- Informe seu nome de domínio

## Documentação Oficial

Para mais detalhes, consulte: https://docs.lovable.dev/faq#how-do-i-connect-my-custom-domain
