# 🚀 Quick Start Guide - Marketing Analytics Dashboard

## Início Rápido (2 minutos)

### 1️⃣ Abrir o Dashboard
Abra este arquivo no seu navegador:
```
C:\Users\victo\.gemini\antigravity\scratch\marketing-dashboard\index.html
```

### 2️⃣ Testar com Dados de Exemplo
1. Clique em **"Selecionar Arquivos CSV"**
2. Selecione o arquivo: `sample-campaigns.csv` (na mesma pasta)
3. Veja o dashboard aparecer automaticamente! ✨

### 3️⃣ Explorar
- 📊 **Métricas**: Veja os 6 cards com KPIs principais
- 📈 **Gráficos**: 4 visualizações interativas
- 🔍 **Filtros**: Teste filtrar por CRM, data, status
- 🔎 **Busca**: Digite na caixa de busca
- 🌓 **Tema**: Clique no ícone de lua/sol

---

## 📁 Seus Próprios Dados

### Formato do CSV
Seu CSV deve ter colunas como:
```csv
nome,data,emails_enviados,aberturas,cliques,conversoes,receita,status
Campanha X,2024-11-29,10000,3000,500,50,5000.00,active
```

### Colunas Aceitas
O dashboard reconhece automaticamente:
- **Nome**: nome, name, campaign, campanha
- **Data**: data, date, send_date
- **Enviados**: enviados, sent, emails_sent
- **Aberturas**: aberturas, opens, unique_opens
- **Cliques**: cliques, clicks, unique_clicks
- **Conversões**: conversões, conversions, conversoes
- **Receita**: receita, revenue, valor
- **Status**: status, state, estado

---

## 🎯 Principais Funcionalidades

### Upload
- ✅ Arraste e solte múltiplos CSVs
- ✅ Detecção automática de CRM (Edrone, Sendinpulse, RD Station)
- ✅ Suporta vírgula (,) ou ponto-e-vírgula (;)

### Visualizações
- ✅ **6 Métricas**: Total campanhas, taxa abertura, CTR, conversões, enviados, receita
- ✅ **4 Gráficos**: Timeline, funil, top 10, distribuição por CRM
- ✅ **Tabela Completa**: Com todas as campanhas e métricas

### Filtros
- ✅ Por CRM específico
- ✅ Por período (7, 30, 90 dias)
- ✅ Por status (ativa, pausada, concluída)
- ✅ Busca em tempo real

### Extras
- ✅ Modo escuro/claro
- ✅ Exportar para CSV
- ✅ Dados salvos localmente (privacidade)
- ✅ Responsivo para apresentações

---

## 💡 Dicas Rápidas

### Para Apresentar ao Cliente
1. Pressione **F11** para tela cheia
2. Use **modo escuro** em salas escuras
3. Aplique **filtros** para mostrar dados específicos
4. **Hover** nos gráficos para ver detalhes

### Para Análise
1. Compare **diferentes CRMs** usando o filtro
2. Veja **tendências** no gráfico de timeline
3. Identifique **top performers** no ranking
4. **Exporte** dados filtrados para compartilhar

---

## 🔧 Troubleshooting

**CSV não carrega?**
- Verifique se tem extensão `.csv`
- Teste com `sample-campaigns.csv` primeiro
- Certifique-se que tem header + pelo menos 1 linha de dados

**Gráficos não aparecem?**
- Verifique conexão com internet (Chart.js via CDN)
- Atualize a página (Ctrl+F5)

**Dados não salvam?**
- Não use modo anônimo
- Habilite localStorage no navegador

---

## 📞 Precisa de Ajuda?

Consulte o arquivo **README.md** para documentação completa ou **walkthrough.md** para detalhes técnicos.

---

**Pronto! Agora você tem um dashboard profissional para seus clientes! 🎉**
