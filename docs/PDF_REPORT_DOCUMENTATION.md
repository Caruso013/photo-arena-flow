# 📄 Relatório Financeiro PDF - STA Fotos

## 🎯 Funcionalidade Implementada

### **Gerador de Relatório Profissional em PDF para Contador**

✅ **Formato PDF** com design profissional
✅ **Logo STA Fotos** no cabeçalho (preto #0d0d0d + dourado #e6b800)
✅ **Tabela completa** de vendas por fotógrafo
✅ **Data e hora** de geração do relatório
✅ **Valores totais** e estatísticas resumidas
✅ **Paginação automática** para muitos fotógrafos
✅ **Rodapé profissional** em cada página

---

## 📊 Estrutura do PDF

### **1. CABEÇALHO (Header)**
```
┌─────────────────────────────────────────────┐
│  [Fundo Preto #0d0d0d]                      │
│                                              │
│           STA FOTOS (Dourado)                │
│     Relatório Financeiro - Contador          │
│                                              │
└─────────────────────────────────────────────┘
```

### **2. INFORMAÇÕES DO RELATÓRIO**
```
RELATÓRIO FINANCEIRO
Data de Emissão: 13/01/2025 às 16:30
Período: Todas as transações
─────────────────────────────────────────────
```

### **3. RESUMO EXECUTIVO**
```
┌─────────────────────────────────────────────┐
│ RESUMO EXECUTIVO                            │
│                                              │
│ Receita Total:              R$ 15.000,00    │
│ Total de Fotógrafos:        25              │
│ Total de Fotos Vendidas:    120             │
│ Ticket Médio:               R$ 125,00       │
└─────────────────────────────────────────────┘
```

### **4. TABELA DE VENDAS POR FOTÓGRAFO**
```
VENDAS POR FOTÓGRAFO

┌────┬─────────────────┬────────┬───────┬────────────────┬──────────────┐
│ #  │ Fotógrafo       │ Vendas │ Fotos │ Receita Total  │ Ticket Médio │
├────┼─────────────────┼────────┼───────┼────────────────┼──────────────┤
│ 1  │ João Silva      │   45   │  45   │  R$ 5.625,00  │  R$ 125,00   │
│ 2  │ Maria Santos    │   38   │  38   │  R$ 4.750,00  │  R$ 125,00   │
│ 3  │ Pedro Costa     │   25   │  25   │  R$ 3.125,00  │  R$ 125,00   │
│ ...│ ...             │  ...   │  ...  │    ...         │    ...       │
└────┴─────────────────┴────────┴───────┴────────────────┴──────────────┘
```

### **5. OBSERVAÇÕES FINAIS**
```
OBSERVAÇÕES:
• Este relatório contém informações confidenciais para fins contábeis.
• Todos os valores estão em Reais (R$).
• As vendas incluem apenas transações com status "completed".
```

### **6. RODAPÉ (Footer)**
```
─────────────────────────────────────────────
STA Fotos - Relatório Confidencial    13/01/2025
                Página 1 de 2
```

---

## 🎨 Design e Cores

### **Paleta de Cores:**
| Elemento | Cor | Hex |
|----------|-----|-----|
| Header Background | Preto STA | `#0d0d0d` |
| Logo Text | Dourado STA | `#e6b800` |
| Table Header BG | Preto | `#0d0d0d` |
| Table Header Text | Dourado | `#e6b800` |
| Resumo BG | Cinza Claro | `#fafafa` |
| Linha Separadora | Dourado | `#e6b800` |

### **Tipografia:**
- **Logo**: Helvetica Bold, 24pt
- **Títulos**: Helvetica Bold, 11pt
- **Corpo**: Helvetica Normal, 9pt
- **Tabela**: Helvetica, 8-9pt

---

## 📋 Dados Incluídos no Relatório

### **Resumo Executivo:**
1. ✅ **Receita Total** - Soma de todas as vendas
2. ✅ **Total de Fotógrafos** - Quantidade de fotógrafos com vendas
3. ✅ **Total de Fotos Vendidas** - Quantidade de fotos vendidas
4. ✅ **Ticket Médio** - Valor médio por venda

### **Tabela Detalhada por Fotógrafo:**
1. ✅ **# (Ranking)** - Posição do fotógrafo
2. ✅ **Nome do Fotógrafo** - Nome completo
3. ✅ **Vendas** - Quantidade de vendas
4. ✅ **Fotos** - Quantidade de fotos vendidas
5. ✅ **Receita Total** - Total vendido por fotógrafo (R$)
6. ✅ **Ticket Médio** - Valor médio por foto (R$)

### **Metadados:**
1. ✅ **Data de Emissão** - Data e hora de geração (dd/mm/yyyy às hh:mm)
2. ✅ **Período** - "Todas as transações"
3. ✅ **Paginação** - "Página X de Y"
4. ✅ **Observações** - Notas legais e contábeis

---

## 💾 Arquivo Gerado

### **Nome do Arquivo:**
```
relatorio-financeiro-sta-YYYY-MM-DD.pdf
```

**Exemplo:**
```
relatorio-financeiro-sta-2025-01-13.pdf
```

### **Formato:**
- **Tipo**: PDF (Portable Document Format)
- **Tamanho da Página**: A4 (210mm x 297mm)
- **Orientação**: Retrato (Portrait)
- **Margem**: 14mm lateral

---

## 🔧 Implementação Técnica

### **Bibliotecas Utilizadas:**
```bash
npm install jspdf jspdf-autotable
```

1. **jsPDF** - Geração do PDF
2. **jspdf-autotable** - Criação de tabelas formatadas

### **Imports:**
```tsx
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
```

### **Função Principal:**
```tsx
const generateFinancialReport = async () => {
  // 1. Criar documento PDF (A4)
  const doc = new jsPDF();
  
  // 2. Desenhar header com logo STA
  doc.setFillColor(13, 13, 13); // Preto
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(230, 184, 0); // Dourado
  doc.text('STA FOTOS', pageWidth / 2, 20, { align: 'center' });
  
  // 3. Adicionar informações do relatório
  doc.text(`Data de Emissão: ${formattedDate} às ${formattedTime}`, 14, 58);
  
  // 4. Desenhar resumo executivo
  doc.setFillColor(250, 250, 250);
  doc.rect(14, yPosition - 5, pageWidth - 28, 35, 'F');
  doc.text(`Receita Total: ${formatCurrency(totalRevenue)}`, 18, yPosition);
  
  // 5. Gerar tabela com autoTable
  autoTable(doc, {
    startY: yPosition + 5,
    head: [['#', 'Fotógrafo', 'Vendas', 'Fotos', 'Receita Total', 'Ticket Médio']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [13, 13, 13], // Preto STA
      textColor: [230, 184, 0], // Dourado
      fontStyle: 'bold',
      fontSize: 9
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 20, halign: 'center' },
      4: { cellWidth: 35, halign: 'right' },
      5: { cellWidth: 35, halign: 'right' }
    }
  });
  
  // 6. Salvar arquivo
  doc.save(fileName);
}
```

---

## 🎯 Features Implementadas

### **Header Profissional:**
✅ Fundo preto sólido (#0d0d0d)
✅ Logo "STA FOTOS" em dourado (#e6b800), bold, centralizado
✅ Subtítulo "Relatório Financeiro - Contador"
✅ Design moderno e clean

### **Resumo Executivo:**
✅ Box com fundo cinza claro (#fafafa)
✅ 4 métricas principais em destaque
✅ Valores formatados em R$ (Real brasileiro)
✅ Alinhamento consistente

### **Tabela de Fotógrafos:**
✅ **Paginação automática** - Se não couber em 1 página, cria páginas extras
✅ **Header striped** - Fundo preto + texto dourado
✅ **Linhas zebradas** - Alternância de cores para legibilidade
✅ **Alinhamento inteligente**:
  - Números (#, Vendas, Fotos): Centro
  - Texto (Nome): Esquerda
  - Valores (R$): Direita
✅ **Colunas responsivas** - Larguras otimizadas

### **Footer em Cada Página:**
✅ "STA Fotos - Relatório Confidencial" (esquerda)
✅ Data (direita)
✅ "Página X de Y" (centro)
✅ Fonte pequena (8pt) e cinza (#808080)

### **Observações Legais:**
✅ Texto informativo para contador
✅ Nota sobre valores em Reais
✅ Aviso sobre transações "completed"

---

## 📱 Interface do Botão

### **Card do Relatório:**
```tsx
<Card className="border-dashed border-2">
  <CardContent className="p-6">
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Informações */}
      <div className="space-y-1">
        <FileText className="h-5 w-5 text-primary" />
        <h3>Relatório Financeiro PDF - Contador</h3>
        <p>Gere um relatório profissional em PDF com logo STA...</p>
        
        {/* Badges */}
        <Badge>📄 Formato PDF Profissional</Badge>
        <Badge>📊 Receita: R$ 15.000,00</Badge>
        <Badge>👥 25 Fotógrafos</Badge>
        <Badge>📸 120 Fotos</Badge>
      </div>
      
      {/* Botão */}
      <Button onClick={generateFinancialReport}>
        {generatingReport ? (
          <>⏳ Gerando PDF...</>
        ) : (
          <><Download /> Gerar PDF</>
        )}
      </Button>
    </div>
  </CardContent>
</Card>
```

### **Estados do Botão:**
1. **Normal**: 
   - Texto: "Gerar PDF"
   - Ícone: Download
   - Cor: Dourado (primary)

2. **Loading**: 
   - Texto: "Gerando PDF..."
   - Ícone: ⏳ (spinner animado)
   - Disabled: true

3. **Sucesso**: 
   - Toast: "Relatório PDF gerado com sucesso!"
   - Descrição: Nome do arquivo + Total
   - Arquivo baixado automaticamente

4. **Erro**: 
   - Toast: "Erro ao gerar relatório"
   - Descrição: "Não foi possível gerar o relatório em PDF..."
   - Variant: Destructive (vermelho)

---

## ✅ Checklist de Validação

### **Design:**
- [x] Logo STA Fotos no header
- [x] Cores preto #0d0d0d + dourado #e6b800
- [x] Tipografia profissional (Helvetica)
- [x] Layout limpo e organizado
- [x] Linha separadora dourada

### **Conteúdo:**
- [x] Data e hora de emissão
- [x] Período do relatório
- [x] Resumo executivo (4 métricas)
- [x] Tabela completa de fotógrafos
- [x] Observações legais
- [x] Paginação automática

### **Dados:**
- [x] Receita total
- [x] Total de fotógrafos
- [x] Total de fotos vendidas
- [x] Ticket médio calculado
- [x] Nome de cada fotógrafo
- [x] Vendas por fotógrafo
- [x] Receita por fotógrafo
- [x] Ticket médio por fotógrafo

### **UX:**
- [x] Botão visível apenas para admin
- [x] Loading state durante geração
- [x] Toast de sucesso com detalhes
- [x] Toast de erro com mensagem clara
- [x] Download automático do PDF
- [x] Nome de arquivo com data

---

## 🚀 Como Testar

### **1. Iniciar Dev Server:**
```bash
npm run dev
```

### **2. Logar como Admin:**
- Email: admin@example.com
- Senha: (sua senha de admin)

### **3. Ir para Dashboard → Financeiro:**
- Clicar na aba "Financeiro"
- Rolar até o card "Relatório Financeiro PDF - Contador"

### **4. Gerar Relatório:**
- Clicar em "Gerar PDF"
- Aguardar mensagem "Gerando PDF..."
- PDF será baixado automaticamente
- Toast de sucesso aparecerá

### **5. Validar PDF:**
- Abrir arquivo `relatorio-financeiro-sta-2025-01-13.pdf`
- Verificar logo STA no header
- Validar resumo executivo
- Conferir tabela de fotógrafos
- Checar paginação (se houver múltiplas páginas)
- Validar rodapé em cada página

---

## 📊 Exemplo Visual do PDF

```
┌────────────────────────────────────────────────────────┐
│ ░░░░░░░░░░░░░░ [FUNDO PRETO] ░░░░░░░░░░░░░░░░░░░░░░░│
│                                                         │
│               🏆 STA FOTOS 🏆 (DOURADO)                 │
│          Relatório Financeiro - Contador               │
│                                                         │
│ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│
│                                                         │
│ RELATÓRIO FINANCEIRO                                    │
│ Data de Emissão: 13/01/2025 às 16:30                  │
│ Período: Todas as transações                           │
│ ─────────────────────────────────────────────────────  │
│                                                         │
│ ┌─────────────────────────────────────────────────┐   │
│ │ RESUMO EXECUTIVO                                 │   │
│ │                                                   │   │
│ │ Receita Total:         R$ 15.000,00             │   │
│ │ Total de Fotógrafos:   25                        │   │
│ │ Total de Fotos:        120                       │   │
│ │ Ticket Médio:          R$ 125,00                │   │
│ └─────────────────────────────────────────────────┘   │
│                                                         │
│ VENDAS POR FOTÓGRAFO                                    │
│                                                         │
│ ╔════╦═══════════════╦════════╦═══════╦═══════════╗   │
│ ║ #  ║ Fotógrafo     ║ Vendas ║ Fotos ║ Receita   ║   │
│ ╠════╬═══════════════╬════════╬═══════╬═══════════╣   │
│ ║ 1  ║ João Silva    ║   45   ║  45   ║ R$ 5.625 ║   │
│ ║ 2  ║ Maria Santos  ║   38   ║  38   ║ R$ 4.750 ║   │
│ ║ 3  ║ Pedro Costa   ║   25   ║  25   ║ R$ 3.125 ║   │
│ ╚════╩═══════════════╩════════╩═══════╩═══════════╝   │
│                                                         │
│ OBSERVAÇÕES:                                            │
│ • Relatório confidencial para fins contábeis          │
│ • Valores em Reais (R$)                                │
│                                                         │
│ ─────────────────────────────────────────────────────  │
│ STA Fotos - Confidencial    Página 1 de 1   13/01/2025│
└────────────────────────────────────────────────────────┘
```

---

## 🎯 Melhorias Futuras (Opcional)

### **Possíveis Adições:**
- [ ] Filtro de período (mês, ano, customizado)
- [ ] Gráficos em PDF (pizza, barras)
- [ ] Logo STA como imagem (não texto)
- [ ] Assinatura digital do admin
- [ ] QR Code para verificação online
- [ ] Breakdown por categoria de foto
- [ ] Comparação com período anterior
- [ ] Enviar PDF por email automaticamente
- [ ] Salvar histórico de relatórios

---

**Status:** ✅ Implementado - Pronto para testes
**Próxima ação:** Rodar `npm run dev` e gerar primeiro PDF
**Impacto:** Relatório profissional para contador com todos os dados necessários
