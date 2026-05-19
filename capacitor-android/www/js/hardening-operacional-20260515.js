/*
 * thIAguinho SaaS - hardening operacional/fiscal/financeiro 2026-05-15
 * Camada conservadora: nao substitui os motores existentes; corrige fluxos
 * criticos de lote, auditoria interna, exibicao e IA local.
 */
(function () {
  'use strict';

  const W = window;
  const D = document;
  const byId = id => D.getElementById(id);
  const J = () => W.J || {};
  const db = () => W.db || null;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  }
  function num(v) {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const s = String(v == null ? '' : v).replace(/\s/g, '').replace(/R\$/gi, '');
    if (!s) return 0;
    return parseFloat(s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s) || 0;
  }
  function moeda(v) {
    return new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(num(v));
  }
  function norm(v) {
    return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  }
  function placaNorm(v) {
    return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function toast(msg, type) {
    if (typeof W.toast === 'function') W.toast(msg, type || 'ok');
    else console.log('[thIAguinho]', msg);
  }
  function modEnabled(key) {
    try { return typeof W.thiaModEnabled === 'function' ? W.thiaModEnabled(key) : (J().oficina?.modulos?.[key] !== false); }
    catch (_) { return true; }
  }
  function secret177() {
    return W._pecasReaisDesbloqueadas === true || D.body?.dataset?.secret177 === 'on';
  }
  function osUtils() {
    return W.JarvisOSUtils || W.JOS || {};
  }
  function clienteNome(id) {
    return (J().clientes || []).find(c => c.id === id)?.nome || '';
  }
  function veiculoByOS(os) {
    return (J().veiculos || []).find(v => v.id === (os?.veiculoId || os?.veiculo)) || {};
  }
  function osLabel(os) {
    const v = veiculoByOS(os);
    const c = (J().clientes || []).find(x => x.id === (os?.clienteId || v.clienteId)) || {};
    const placa = (os?.placa || v.placa || 'S/PLACA').toUpperCase();
    const prefixo = os?.prefixo || v.prefixo || '';
    const modelo = [v.marca, v.modelo || os?.veiculo].filter(Boolean).join(' ') || 'Veiculo';
    return `${prefixo ? 'Prefixo ' + prefixo + ' - ' : ''}${placa} - ${modelo} - ${c.nome || os?.cliente || 'Cliente'} - OS #${String(os?.id || '').slice(-6).toUpperCase()} - ${os?.status || 'sem status'}`;
  }

  function installCSS() {
    if (byId('hardeningOperacionalCss')) return;
    const st = D.createElement('style');
    st.id = 'hardeningOperacionalCss';
    st.textContent = `
      .op-card{border:1px solid var(--border);background:var(--surf2);border-radius:4px;padding:12px;margin:12px 0;}
      .op-title{font-family:var(--fd);font-weight:800;letter-spacing:.8px;color:var(--cyan);font-size:.78rem;margin-bottom:8px;}
      .op-grid{display:grid;gap:8px;}
      .op-chip{display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border);border-radius:3px;padding:3px 7px;font-family:var(--fm);font-size:.62rem;margin:2px;background:rgba(255,255,255,.04);}
      .op-chip.ok{color:var(--success);border-color:rgba(0,255,170,.28);}
      .op-chip.warn{color:var(--warn);border-color:rgba(255,184,0,.35);}
      .op-chip.danger{color:var(--danger);border-color:rgba(255,59,59,.35);}
      .op-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:4px;}
      .op-table{width:100%;border-collapse:collapse;min-width:720px;}
      .op-table th,.op-table td{padding:8px;border-bottom:1px solid var(--border);text-align:left;font-size:.74rem;vertical-align:top;}
      .op-table th{font-family:var(--fm);font-size:.62rem;color:var(--muted);letter-spacing:.8px;background:rgba(0,0,0,.12);}
      .nf-batch-tools{border:1px solid rgba(0,194,255,.22);background:rgba(0,194,255,.06);border-radius:4px;padding:10px;margin-bottom:10px;}
      .nf-real-row{position:relative;}
      .nf-batch-check{position:absolute;right:44px;top:8px;z-index:2;font-family:var(--fm);font-size:.6rem;color:var(--cyan);display:flex;align-items:center;gap:4px;background:var(--surf2);border:1px solid var(--border);border-radius:3px;padding:3px 6px;}
      .exec-finalizados details{border:1px solid rgba(0,255,170,.18);background:rgba(0,255,170,.035);border-radius:4px;padding:8px;}
      .exec-finalizados summary{cursor:pointer;font-family:var(--fm);font-size:.7rem;color:var(--success);font-weight:800;letter-spacing:.8px;}
      @media(max-width:900px){.op-table{min-width:640px}.nf-batch-tools .form-row{grid-template-columns:1fr!important}.execucao-aprovado-row{grid-template-columns:1fr!important}}
    `;
    D.head.appendChild(st);
  }

  function osOptionsHTML(selected) {
    return `<option value="">Selecione placa / O.S. / cliente...</option>` + (J().os || [])
      .filter(o => !/cancelad/i.test(String(o.status || '')))
      .sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
      .map(o => `<option value="${esc(o.id)}" ${String(selected||'')===String(o.id)?'selected':''}>${esc(osLabel(o))}</option>`)
      .join('');
  }

  function addNFRowCheckbox(row) {
    if (!row || row.querySelector('.nf-item-check')) return;
    row.insertAdjacentHTML('afterbegin', `<label class="nf-batch-check"><input type="checkbox" class="nf-item-check" checked> vinculo em lote</label>`);
  }

  function ensureNFBatchTools() {
    const cont = byId('containerItensNF');
    if (!cont) return;
    let tools = byId('nfBatchVinculoTools');
    if (!tools) {
      tools = D.createElement('div');
      tools.id = 'nfBatchVinculoTools';
      tools.className = 'nf-batch-tools';
      tools.innerHTML = `
        <div class="op-title">VINCULO EM LOTE DA NF</div>
        <div class="form-row cols-2" style="align-items:end;">
          <div class="form-group"><label class="j-label">Veiculo / O.S. destino</label><select class="j-select" id="nfBatchOSSelect"></select></div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="btn-ghost" onclick="window.nfBatchMarcarTodos(true)">MARCAR TODOS</button>
            <button type="button" class="btn-ghost" onclick="window.nfBatchMarcarTodos(false)">LIMPAR</button>
            <button type="button" class="btn-primary" onclick="window.nfBatchAplicar('selecionados')">VINCULAR MARCADOS</button>
            <button type="button" class="btn-outline" onclick="window.nfBatchAplicar('todos')">VINCULAR TODOS A ESTA O.S.</button>
            <button type="button" class="btn-outline" onclick="window.nfBatchEstoqueSelecionados()">MANTER MARCADOS EM ESTOQUE</button>
          </div>
        </div>
        <div style="font-family:var(--fm);font-size:.62rem;color:var(--muted);line-height:1.4;">Ao vincular a O.S./placa, a entrada fiscal registra a compra, cria vinculo interno e baixa automaticamente o saldo disponivel do estoque. A peca aparece na aba secreta Pecas Reais somente com *177.</div>`;
      cont.parentElement?.insertBefore(tools, cont);
    }
    const sel = byId('nfBatchOSSelect');
    if (sel) {
      const old = sel.value;
      sel.innerHTML = osOptionsHTML(old);
      if (old && Array.from(sel.options).some(opt => opt.value === old)) sel.value = old;
    }
    cont.querySelectorAll('.nf-real-row').forEach(addNFRowCheckbox);
  }

  W.nfBatchMarcarTodos = function (on) {
    D.querySelectorAll('#containerItensNF .nf-item-check').forEach(ch => { ch.checked = !!on; });
  };
  W.nfBatchAplicar = function (modo) {
    const osId = byId('nfBatchOSSelect')?.value || '';
    if (!osId) { toast('Selecione uma O.S./veiculo para vincular.', 'warn'); return; }
    const os = (J().os || []).find(o => String(o.id) === String(osId));
    const rows = Array.from(D.querySelectorAll('#containerItensNF .nf-real-row'))
      .filter(row => modo === 'todos' || row.querySelector('.nf-item-check')?.checked);
    if (!rows.length) { toast('Nenhuma peca marcada para vincular.', 'warn'); return; }
    rows.forEach(row => {
      const finalidade = row.querySelector('.nf-finalidade');
      if (finalidade) { finalidade.value = 'os'; W._nfeProToggleDestino?.(finalidade); }
      const osSel = row.querySelector('.nf-os-select');
      if (osSel) osSel.value = osId;
      const v = veiculoByOS(os);
      const vinc = row.querySelector('.nf-vinculo');
      if (vinc) vinc.value = [os?.prefixo || v.prefixo, os?.placa || v.placa, 'OS ' + String(osId).slice(-6).toUpperCase()].filter(Boolean).join(' / ');
      const chk = row.querySelector('.nf-item-check');
      if (chk) chk.checked = false;
    });
    toast(`${rows.length} peca(s) vinculada(s). Finalize a entrada para gravar NF, baixa e auditoria.`, 'ok');
  };
  W.nfBatchEstoqueSelecionados = function () {
    const rows = Array.from(D.querySelectorAll('#containerItensNF .nf-real-row')).filter(row => row.querySelector('.nf-item-check')?.checked);
    rows.forEach(row => {
      const finalidade = row.querySelector('.nf-finalidade');
      if (finalidade) { finalidade.value = 'estoque'; W._nfeProToggleDestino?.(finalidade); }
      const osSel = row.querySelector('.nf-os-select');
      if (osSel) osSel.value = '';
      const vinc = row.querySelector('.nf-vinculo');
      if (vinc) vinc.value = '';
      row.querySelector('.nf-item-check').checked = false;
    });
    toast(`${rows.length} peca(s) marcada(s) para saldo de estoque.`, 'ok');
  };

  function wrapNFOpeners() {
    ['prepNF','lerXMLNFe','adicionarItemNF'].forEach(name => {
      const old = W[name];
      if (typeof old !== 'function' || old._hardeningWrapped) return;
      const wrapped = function () {
        const r = old.apply(this, arguments);
        setTimeout(ensureNFBatchTools, 80);
        setTimeout(ensureNFBatchTools, 320);
        return r;
      };
      wrapped._hardeningWrapped = true;
      W[name] = wrapped;
    });
    const cont = byId('containerItensNF');
    if (cont && !cont._nfBatchObserver) {
      cont._nfBatchObserver = new MutationObserver(() => ensureNFBatchTools());
      cont._nfBatchObserver.observe(cont, { childList:true, subtree:false });
    }
  }

  function statusOptions(tipo, atual) {
    const isPeca = String(tipo || '').toLowerCase().includes('peca');
    const opts = isPeca
      ? [['pendente','Pendente'],['em_execucao','Separando/comprando'],['trocada','Trocada/aplicada'],['nao_encontrada','Peca nao encontrada'],['nao_trocada','Nao aplicada'],['cancelado','Cancelado']]
      : [['pendente','Pendente'],['em_execucao','Em execucao'],['executado','Executado'],['executado_obs','Executado com observacao'],['nao_executado','Nao executado'],['cancelado','Cancelado']];
    return opts.map(([v,l]) => `<option value="${v}" ${String(atual||'pendente')===v?'selected':''}>${l}</option>`).join('');
  }
  function statusFinalizado(st) {
    return /^(executado|executado_obs|executado_com_observacao|trocada|nao_executado|nao_trocada|nao_encontrada|cancelado)$/i.test(String(st || ''));
  }
  function itemHTML(it, e) {
    const st = e?.status || 'pendente';
    const finalizado = statusFinalizado(st);
    return `<div class="execucao-aprovado-row" data-key="${esc(it.key)}" data-tipo="${esc(it.tipo)}" style="display:grid;grid-template-columns:minmax(230px,1fr) 190px minmax(200px,1fr);gap:7px;align-items:center;background:${finalizado?'rgba(0,255,170,.045)':'rgba(0,0,0,.16)'};border:1px solid rgba(255,255,255,.10);border-radius:3px;padding:8px;">
      <div style="font-size:.75rem;color:var(--text);"><b>${esc(it.labelTipo || it.tipo)}</b> ${it.codigo ? '[' + esc(it.codigo) + '] ' : ''}${esc(it.desc || '-')}${it.tempo ? `<br><small style="color:var(--muted);">TMO ${String(it.tempo).replace('.', ',')}h</small>` : ''}</div>
      <select class="j-select exec-status" style="font-size:.72rem;" onchange="window.reorganizarExecucaoAprovadosOS()">${statusOptions(it.tipo, st)}</select>
      <input class="j-input exec-obs" value="${esc(e?.obs || '')}" placeholder="Observacao interna obrigatoria quando houver excecao">
    </div>`;
  }

  W.reorganizarExecucaoAprovadosOS = function () {
    const pend = byId('execPendentesOS');
    const fin = byId('execFinalizadosListaOS');
    if (!pend || !fin) return;
    Array.from(D.querySelectorAll('#resumoAprovacaoOS .execucao-aprovado-row')).forEach(row => {
      const st = row.querySelector('.exec-status')?.value || 'pendente';
      (statusFinalizado(st) ? fin : pend).appendChild(row);
    });
    const count = fin.querySelectorAll('.execucao-aprovado-row').length;
    const lbl = byId('execFinalizadosCountOS');
    if (lbl) lbl.textContent = String(count);
  };

  function overrideAprovacaoOS() {
    if (typeof W.aplicarMarcadoresAprovacaoOS !== 'function' || W.aplicarMarcadoresAprovacaoOS._hardeningExec) return;
    W.aplicarMarcadoresAprovacaoOS = function (os) {
      const U = osUtils();
      byId('resumoAprovacaoOS')?.remove();
      D.querySelectorAll('#containerServicosOS .aprovacao-item-badge,#containerPecasOS .aprovacao-item-badge').forEach(el => el.remove());
      const temAprovacao = U.hasApproval?.(os);
      W.atualizarCotacaoPecasOrcamentoAtualOS?.(os);
      if (!temAprovacao) return;
      const keys = U.getApprovedKeys?.(os) || new Set();
      const itens = U.buildBudgetItems?.(os, (J().clientes || []).find(c => c.id === os?.clienteId)) || [];
      const aprovados = itens.filter(it => keys.has(it.key));
      const nao = itens.filter(it => !keys.has(it.key));
      const exec = os?.execucaoItens || {};
      const pendentes = aprovados.filter(it => !statusFinalizado(exec[it.key]?.status));
      const finalizados = aprovados.filter(it => statusFinalizado(exec[it.key]?.status));
      const totalAprovado = os?.totalAprovado != null ? num(os.totalAprovado) : aprovados.reduce((s,it)=>s+num(it.valorFinal),0);
      const resumo = D.createElement('div');
      resumo.id = 'resumoAprovacaoOS';
      resumo.className = 'aprovacao-resumo';
      resumo.innerHTML = `
        <h4>ORCAMENTO APROVADO - ${aprovados.length}/${itens.length} ITEM(NS) - ${moeda(totalAprovado)}</h4>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 10px;">
          <span class="op-chip ok">${aprovados.length} aprovados</span>
          <span class="op-chip warn">${nao.length} nao aprovados</span>
          <span class="op-chip">${pendentes.length} pendentes/em execucao</span>
          <span class="op-chip ok">${finalizados.length} finalizados</span>
        </div>
        <div class="aprovacao-resumo-grid">
          ${aprovados.map(it => `<div class="aprovacao-resumo-item"><strong style="color:var(--success);">APROVADO</strong><br>${esc(it.labelTipo || it.tipo)} ${it.codigo ? '[' + esc(it.codigo) + '] ' : ''}${esc(it.desc || '-')}<br><b>${moeda(it.valorFinal)}</b></div>`).join('')}
          ${nao.map(it => `<div class="aprovacao-resumo-item nao"><strong style="color:var(--warn);">NAO APROVADO</strong><br>${esc(it.labelTipo || it.tipo)} ${it.codigo ? '[' + esc(it.codigo) + '] ' : ''}${esc(it.desc || '-')}<br><small>Mantido apenas como historico do orcamento.</small></div>`).join('')}
        </div>
        <div style="margin-top:14px;border-top:1px solid rgba(255,255,255,.12);padding-top:12px;">
          <div class="op-title">EXECUCAO INTERNA DOS ITENS APROVADOS</div>
          <div style="font-family:var(--fm);font-size:.60rem;color:var(--muted);margin-bottom:8px;">Ao marcar como executado/trocado/cancelado, o item sai da fila principal e vai para Finalizados. Cliente nao ve observacao interna.</div>
          <div id="execPendentesOS" style="display:grid;gap:7px;">${pendentes.map(it => itemHTML(it, exec[it.key] || {})).join('')}</div>
          <div class="exec-finalizados" style="margin-top:10px;">
            <details id="execFinalizadosOS"><summary>FINALIZADOS / OCULTOS (<span id="execFinalizadosCountOS">${finalizados.length}</span>)</summary><div id="execFinalizadosListaOS" style="display:grid;gap:7px;margin-top:8px;">${finalizados.map(it => itemHTML(it, exec[it.key] || {})).join('')}</div></details>
          </div>
          <button type="button" class="btn-primary" style="margin-top:10px;" onclick="window.salvarExecucaoAprovadosOS('${esc(os?.id || '')}')">SALVAR EXECUCAO INTERNA</button>
        </div>`;
      const alvo = byId('containerServicosOS')?.closest('div');
      if (alvo) alvo.insertAdjacentElement('beforebegin', resumo);
    };
    W.aplicarMarcadoresAprovacaoOS._hardeningExec = true;
  }

  function gruposHistorico(os) {
    const U = osUtils();
    const cli = (J().clientes || []).find(c => c.id === os?.clienteId);
    const itens = U.buildBudgetItems?.(os, cli) || [];
    const hasApproval = U.hasApproval?.(os);
    const keys = U.getApprovedKeys?.(os) || new Set();
    const groups = {
      servAprov: [], pecAprov: [], servNao: [], pecNao: [], reais: []
    };
    itens.forEach(it => {
      const aprovado = !hasApproval ? false : keys.has(it.key);
      const isServico = String(it.tipo || '').toLowerCase().includes('serv');
      const target = aprovado
        ? (isServico ? groups.servAprov : groups.pecAprov)
        : (isServico ? groups.servNao : groups.pecNao);
      target.push(it);
    });
    if (secret177()) groups.reais = Array.isArray(os?.pecasReais) ? os.pecasReais : [];
    return groups;
  }
  function groupText(groups) {
    return Object.values(groups).flat().map(x => [x.desc,x.descricao,x.codigo,x.codigoFornecedor,x.codigoComercial,x.oem,x.marca,x.nf,x.nfNumero,x.fornecedor].join(' ')).join(' ');
  }
  function renderGroup(title, arr, cls) {
    if (!arr.length) return '';
    return `<div style="margin-top:8px;"><strong class="op-chip ${cls||''}">${esc(title)}</strong><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;margin-top:6px;">${arr.map(it => `<div style="border:1px solid var(--border);background:rgba(255,255,255,.03);border-radius:3px;padding:7px;font-size:.72rem;"><b>${it.codigo ? '[' + esc(it.codigo) + '] ' : ''}${esc(it.desc || it.descricao || '-')}</b>${it.qtd ? `<br><small>Qtd ${esc(it.qtd)}</small>`:''}${it.nf || it.nfNumero ? `<br><small>NF ${esc(it.nf || it.nfNumero)} - ${esc(it.fornecedor || '')}</small>`:''}</div>`).join('')}</div></div>`;
  }
  function codigoPecaNormalizado(v) {
    return String(v || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  function termoPareceCodigoPeca(termoRaw) {
    const c = codigoPecaNormalizado(termoRaw);
    return c.length >= 4 && /[0-9]/.test(c) && !/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(c);
  }
  function itemTemCodigoPeca(item, codigo) {
    const campos = [item?.codigo, item?.codigoFornecedor, item?.codigoComercial, item?.oem, item?.ean, item?.codigoOEM];
    return campos.some(v => {
      const c = codigoPecaNormalizado(v);
      return c && (c === codigo || c.includes(codigo) || codigo.includes(c));
    });
  }
  function dataISO(v) {
    return String(v || '').slice(0, 10);
  }
  function dentroPeriodo(data, ini, fim) {
    const d = dataISO(data);
    if (!d) return true;
    if (ini && d < ini) return false;
    if (fim && d > fim) return false;
    return true;
  }
  function ensureKardexPeriodControls(opts) {
    const termoEl = byId(opts?.termoId || 'histBuscaTermo');
    if (!termoEl || byId('kardexPeriodoWrap')) return;
    const wrap = D.createElement('div');
    wrap.id = 'kardexPeriodoWrap';
    wrap.style.cssText = 'display:flex;gap:8px;flex-wrap:wrap;margin:8px 0;align-items:end;';
    wrap.innerHTML = `
      <div class="form-group" style="min-width:150px;"><label class="j-label">Periodo inicial</label><input type="date" class="j-input" id="kardexDataIni"></div>
      <div class="form-group" style="min-width:150px;"><label class="j-label">Periodo final</label><input type="date" class="j-input" id="kardexDataFim"></div>
      <span style="font-family:var(--fm);font-size:.62rem;color:var(--muted);padding-bottom:10px;">Opcional para rastrear Kardex da peca.</span>`;
    const host = termoEl.closest('.op-card') || termoEl.parentElement;
    host?.appendChild(wrap);
  }
  function renderRastreioPecaCodigo(codigo, termoRaw, placaFiltro) {
    const rows = [];
    const seen = new Set();
    const add = (origem, data) => {
      const placa = placaNorm(data.placa || '');
      if (placaFiltro && !(placa === placaFiltro || placa.includes(placaFiltro))) return;
      const key = [origem, data.osId || '', data.nfId || '', data.nfNumero || '', data.codigo || '', data.placa || ''].join('|');
      if (seen.has(key)) return;
      seen.add(key);
      rows.push({ origem, ...data });
    };
    (J().nfItensVinculos || []).forEach(v => {
      if (!itemTemCodigoPeca(v, codigo)) return;
      const os = (J().os || []).find(o => o.id === v.osId) || {};
      const veic = veiculoByOS(os);
      const cli = (J().clientes || []).find(c => c.id === (os.clienteId || veic.clienteId)) || {};
      add('NF/VINCULO', {
        codigo: v.codigoFornecedor || v.codigo || v.codigoComercial || termoRaw,
        desc: v.desc || v.descricao || '',
        marca: v.marca || '',
        placa: v.placa || os.placa || veic.placa || '',
        prefixo: veic.prefixo || os.prefixo || '',
        veiculo: veic.modelo || os.veiculo || os.modelo || '',
        cliente: cli.nome || os.cliente || '',
        osId: v.osId || '',
        nfId: v.nfId || '',
        nfNumero: v.nfNumero || '',
        fornecedor: v.fornecedorNome || v.fornecedor || '',
        dataCompra: v.dataCompra || v.dataNF || v.createdAt || '',
        qtd: v.qtd || v.quantidade || 1,
        baixa: v.estoqueBaixadoAutomatico,
        custo: v.custo || v.valorUnitario || 0
      });
    });
    (J().os || []).forEach(os => {
      const veic = veiculoByOS(os);
      const cli = (J().clientes || []).find(c => c.id === (os.clienteId || veic.clienteId)) || {};
      (Array.isArray(os.pecasReais) ? os.pecasReais : []).forEach(p => {
        if (!itemTemCodigoPeca(p, codigo)) return;
        add('OS/PECAS REAIS', {
          codigo: p.codigoFornecedor || p.codigo || p.codigoComercial || p.oem || termoRaw,
          desc: p.desc || p.descricao || '',
          marca: p.marca || '',
          placa: os.placa || veic.placa || p.placa || '',
          prefixo: veic.prefixo || os.prefixo || '',
          veiculo: veic.modelo || os.veiculo || os.modelo || '',
          cliente: cli.nome || os.cliente || '',
          osId: os.id || '',
          nfId: p.nfId || '',
          nfNumero: p.nfNumero || p.nf || p.notaFiscal || '',
          fornecedor: p.fornecedor || p.fornecedorNome || '',
          dataCompra: p.dataCompra || p.dataNF || '',
          qtd: p.qtd || p.quantidade || 1,
          baixa: p.estoqueBaixadoAutomatico,
          custo: p.custo || p.valorUnitario || 0
        });
      });
    });
    if (!rows.length) {
      return `<div style="color:var(--muted);font-family:var(--fm);font-size:.8rem;padding:10px 0;">Nenhum uso interno encontrado para o codigo ${esc(termoRaw)}.</div>`;
    }
    rows.sort((a,b)=>String(b.dataCompra||'').localeCompare(String(a.dataCompra||'')));
    return `<div style="font-family:var(--fm);font-size:.65rem;color:var(--muted);margin-bottom:8px;">${rows.length} uso(s) encontrado(s) para o codigo <b>${esc(termoRaw)}</b>. Exibindo somente a peça pesquisada.</div>
      <div class="op-table-wrap"><table class="op-table"><thead><tr><th>Codigo / peça</th><th>Usado em</th><th>O.S.</th><th>NF / fornecedor</th><th>Compra</th><th>Qtd / baixa</th></tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td><b>${esc(r.codigo || termoRaw)}</b><br>${esc(r.desc || '-')}<br><small>${esc(r.marca || '')}</small></td>
        <td><b>${esc(r.placa || '-')}</b> ${r.prefixo ? '<span class="op-chip">'+esc(r.prefixo)+'</span>' : ''}<br>${esc(r.veiculo || '-')}<br><small>${esc(r.cliente || '')}</small></td>
        <td>${r.osId ? `<button class="btn-ghost" onclick="window.editarOS && window.editarOS('${esc(r.osId)}')">OS #${esc(String(r.osId).slice(-6).toUpperCase())}</button>` : '-'}</td>
        <td>NF ${esc(r.nfNumero || '-')}<br><small>${esc(r.fornecedor || '-')}</small></td>
        <td>${esc(String(r.dataCompra || '-').slice(0,10))}<br><small>${esc(r.origem || '')}</small></td>
        <td>${esc(r.qtd || 1)}<br><small>${r.baixa ? 'baixado automaticamente' : 'sem baixa automatica registrada'}</small></td>
      </tr>`).join('')}</tbody></table></div>`;
  }
  function renderKardexPecaCodigo(codigo, termoRaw, placaFiltro) {
    const ini = byId('kardexDataIni')?.value || '';
    const fim = byId('kardexDataFim')?.value || '';
    const rows = [];
    const seen = new Map();
    const add = (tipo, origem, data) => {
      const placa = placaNorm(data.placa || '');
      if (placaFiltro && !(placa === placaFiltro || placa.includes(placaFiltro))) return;
      if (!dentroPeriodo(data.dataMov || data.dataCompra || data.createdAt, ini, fim)) return;
      const key = [tipo, data.osId || '', data.nfId || '', data.nfNumero || '', codigoPecaNormalizado(data.codigo || termoRaw), placa, dataISO(data.dataMov || data.dataCompra || data.createdAt), norm(data.desc || '')].join('|');
      if (seen.has(key)) {
        const old = seen.get(key);
        old.origens = Array.from(new Set([...(old.origens || [old.origem]), origem].filter(Boolean)));
        old.qtd = Math.max(num(old.qtd || 0), num(data.qtd || 0)) || old.qtd || data.qtd || 1;
        return;
      }
      const row = { tipo, origem, origens:[origem], ...data };
      seen.set(key, row);
      rows.push(row);
    };
    (J().notasFiscaisEntrada || []).forEach(n => {
      (Array.isArray(n.itens) ? n.itens : []).forEach(i => {
        if (!itemTemCodigoPeca(i, codigo)) return;
        add('ENTRADA', 'NF', {
          codigo: i.codigoFornecedor || i.codigo || i.codigoComercial || termoRaw,
          desc: i.descricao || i.desc || '',
          marca: i.marca || '',
          placa: i.placa || '',
          prefixo: '',
          veiculo: 'Estoque / entrada fiscal',
          cliente: '',
          osId: i.osId || '',
          nfId: n.id || '',
          nfNumero: n.numero || i.nfNumero || '',
          fornecedor: n.fornecedorSnapshot?.nome || n.fornecedorNome || i.fornecedor || '',
          dataCompra: n.dataNF || n.dataEmissao || n.createdAt || '',
          dataMov: n.dataNF || n.dataEmissao || n.createdAt || '',
          qtd: i.quantidade || i.qtd || 1,
          baixa: false,
          custo: i.valorUnitario || i.custo || 0
        });
      });
    });
    (J().nfItensVinculos || []).forEach(v => {
      if (!itemTemCodigoPeca(v, codigo)) return;
      const os = (J().os || []).find(o => o.id === v.osId) || {};
      const veic = veiculoByOS(os);
      const cli = (J().clientes || []).find(c => c.id === (os.clienteId || veic.clienteId)) || {};
      add('SAIDA', 'NF/VINCULO OS', {
        codigo: v.codigoFornecedor || v.codigo || v.codigoComercial || termoRaw,
        desc: v.desc || v.descricao || '',
        marca: v.marca || '',
        placa: v.placa || os.placa || veic.placa || '',
        prefixo: veic.prefixo || os.prefixo || '',
        veiculo: veic.modelo || os.veiculo || os.modelo || '',
        cliente: cli.nome || os.cliente || '',
        osId: v.osId || '',
        nfId: v.nfId || '',
        nfNumero: v.nfNumero || '',
        fornecedor: v.fornecedorNome || v.fornecedor || '',
        dataCompra: v.dataCompra || v.dataNF || v.createdAt || '',
        dataMov: v.dataBaixa || v.vinculadoEm || v.dataCompra || v.dataNF || v.createdAt || '',
        qtd: v.qtd || v.quantidade || 1,
        baixa: v.estoqueBaixadoAutomatico,
        custo: v.custo || v.valorUnitario || 0
      });
    });
    (J().os || []).forEach(os => {
      const veic = veiculoByOS(os);
      const cli = (J().clientes || []).find(c => c.id === (os.clienteId || veic.clienteId)) || {};
      (Array.isArray(os.pecasReais) ? os.pecasReais : []).forEach(p => {
        if (!itemTemCodigoPeca(p, codigo)) return;
        add('SAIDA', 'OS/PECAS REAIS', {
          codigo: p.codigoFornecedor || p.codigo || p.codigoComercial || p.oem || termoRaw,
          desc: p.desc || p.descricao || '',
          marca: p.marca || '',
          placa: os.placa || veic.placa || p.placa || '',
          prefixo: veic.prefixo || os.prefixo || '',
          veiculo: veic.modelo || os.veiculo || os.modelo || '',
          cliente: cli.nome || os.cliente || '',
          osId: os.id || '',
          nfId: p.nfId || '',
          nfNumero: p.nfNumero || p.nf || p.notaFiscal || '',
          fornecedor: p.fornecedor || p.fornecedorNome || '',
          dataCompra: p.dataCompra || p.dataNF || '',
          dataMov: p.dataAplicacao || p.dataCompra || p.dataNF || os.updatedAt || os.createdAt || '',
          qtd: p.qtd || p.quantidade || 1,
          baixa: p.estoqueBaixadoAutomatico,
          custo: p.custo || p.valorUnitario || 0
        });
      });
    });
    if (!rows.length) {
      return `<div style="color:var(--muted);font-family:var(--fm);font-size:.8rem;padding:10px 0;">Nenhum movimento encontrado para o codigo ${esc(termoRaw)}.</div>`;
    }
    const saldo = rows.reduce((s, r) => s + (r.tipo === 'ENTRADA' ? num(r.qtd || 0) : -num(r.qtd || 0)), 0);
    rows.sort((a,b)=>String(b.dataMov || b.dataCompra || '').localeCompare(String(a.dataMov || a.dataCompra || '')));
    return `<div style="font-family:var(--fm);font-size:.65rem;color:var(--muted);margin-bottom:8px;">Kardex interno do codigo <b>${esc(termoRaw)}</b>: ${rows.length} movimento(s). Saldo calculado pelos movimentos carregados: <b>${esc(saldo)}</b>. ${ini || fim ? `Periodo: ${esc(ini || 'inicio')} a ${esc(fim || 'hoje')}.` : 'Periodo: todos.'}</div>
      <div class="op-table-wrap"><table class="op-table"><thead><tr><th>Movimento</th><th>Codigo / peca</th><th>Veiculo / destino</th><th>O.S.</th><th>NF / fornecedor</th><th>Data</th><th>Qtd / baixa</th></tr></thead><tbody>
      ${rows.map(r => `<tr>
        <td><span class="op-chip ${r.tipo === 'ENTRADA' ? 'ok' : 'warn'}">${esc(r.tipo || '-')}</span><br><small>${esc((r.origens || [r.origem]).join(' + '))}</small></td>
        <td><b>${esc(r.codigo || termoRaw)}</b><br>${esc(r.desc || '-')}<br><small>${esc(r.marca || '')}</small></td>
        <td><b>${esc(r.placa || '-')}</b> ${r.prefixo ? '<span class="op-chip">'+esc(r.prefixo)+'</span>' : ''}<br>${esc(r.veiculo || '-')}<br><small>${esc(r.cliente || '')}</small></td>
        <td>${r.osId ? `<button class="btn-ghost" onclick="window.editarOS && window.editarOS('${esc(r.osId)}')">OS #${esc(String(r.osId).slice(-6).toUpperCase())}</button>` : '-'}</td>
        <td>NF ${esc(r.nfNumero || '-')}<br><small>${esc(r.fornecedor || '-')}</small></td>
        <td>${esc(String(r.dataMov || r.dataCompra || '-').slice(0,10))}<br><small>compra ${esc(String(r.dataCompra || '-').slice(0,10))}</small></td>
        <td>${esc(r.qtd || 1)}<br><small>${r.baixa ? 'baixado automaticamente' : 'sem baixa automatica registrada'}</small></td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  function overrideHistoricoOS() {
    W.buscarHistoricoOS = function (opts = {}) {
      const placaId = opts.placaId || 'histBuscaPlaca';
      const termoId = opts.termoId || 'histBuscaTermo';
      const resultadoId = opts.resultadoId || 'histBuscaResultado';
      ensureKardexPeriodControls(opts);
      const placa = placaNorm(byId(placaId)?.value || '');
      const termoRaw = byId(termoId)?.value || '';
      const termo = norm(termoRaw);
      const el = byId(resultadoId);
      if (!el) return;
      if (!placa && !termo) { el.innerHTML = '<div style="color:var(--muted);font-size:.8rem;">Digite placa e/ou peca/servico.</div>'; return; }
      if (secret177() && termoRaw && termoPareceCodigoPeca(termoRaw)) {
        el.innerHTML = renderKardexPecaCodigo(codigoPecaNormalizado(termoRaw), termoRaw, placa);
        return;
      }
      const hits = (J().os || []).filter(o => {
        const v = veiculoByOS(o);
        const p = placaNorm(o.placa || v.placa || '');
        if (placa && !(p === placa || p.includes(placa))) return false;
        if (!termo) return true;
        const groups = gruposHistorico(o);
        return norm(groupText(groups)).includes(termo);
      });
      if (!hits.length) { el.innerHTML = `<div style="color:var(--muted);font-family:var(--fm);font-size:.8rem;padding:10px 0;">Nenhuma O.S. encontrada.</div>`; return; }
      el.innerHTML = `<div style="font-family:var(--fm);font-size:.65rem;color:var(--muted);margin-bottom:6px;">${hits.length} O.S. encontrada(s)</div>` + hits.map(o => {
        const v = veiculoByOS(o);
        const c = (J().clientes || []).find(x => x.id === o.clienteId) || {};
        const g = gruposHistorico(o);
        return `<div class="op-card">
          <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;">
            <div><b style="color:var(--cyan);font-family:var(--fm);">OS #${esc(String(o.numero || o.id || '').slice(-6).toUpperCase())}</b> <span class="op-chip">${esc(v.prefixo || o.prefixo || '')}</span> <span class="op-chip">${esc(o.placa || v.placa || '')}</span> <span class="op-chip">${esc(v.modelo || o.veiculo || '')}</span></div>
            <div style="font-family:var(--fm);font-size:.68rem;color:var(--muted);">${esc(c.nome || o.cliente || '')} - ${esc(o.status || '')}</div>
          </div>
          ${renderGroup('SERVICOS APROVADOS', g.servAprov, 'ok')}
          ${renderGroup('PECAS APROVADAS', g.pecAprov, 'ok')}
          ${renderGroup('SERVICOS NAO APROVADOS', g.servNao, 'warn')}
          ${renderGroup('PECAS NAO APROVADAS', g.pecNao, 'warn')}
          ${secret177() ? renderGroup('PECAS REAIS / AUDITORIA *177', g.reais, 'danger') : ''}
        </div>`;
      }).join('');
    };
  }

  function installFiscalListeners() {
    if (W._hardeningFiscalListeners || !db() || !J().tid) return;
    W._hardeningFiscalListeners = true;
    const listen = (col, target, renderer) => {
      try {
        return db().collection(col).where('tenantId','==',J().tid).onSnapshot(snap => {
          J()[target] = snap.docs.map(d => ({ id:d.id, ...d.data() }));
          renderer?.();
        }, err => console.warn('[hardening fiscal]', col, err.message));
      } catch (e) { console.warn('[hardening fiscal]', col, e.message); return null; }
    };
    listen('notas_fiscais_entrada','notasFiscaisEntrada', renderDocsFiscais);
    listen('nf_itens_vinculos','nfItensVinculos', renderDocsFiscais);
    listen('estoque_movimentos','estoqueMovimentos', renderDocsFiscais);
    listen('pacotes_boletos','pacotesBoletos', renderPacotesBoletos);
  }

  function installDocsFiscaisPanel() {
    const sec = byId('s-estoque');
    if (!sec || byId('docsFiscaisPanel')) return;
    const panel = D.createElement('div');
    panel.id = 'docsFiscaisPanel';
    panel.className = 'op-card';
    panel.innerHTML = `
      <div class="op-title">NOTAS FISCAIS / ENTRADAS / SAIDAS</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;">
        <input class="j-input" id="fiscalDocBusca" placeholder="Buscar por NF, fornecedor, codigo, placa, O.S." style="min-width:260px;flex:1;" oninput="window.renderDocsFiscaisHardening()">
        <select class="j-select" id="fiscalDocTipo" onchange="window.renderDocsFiscaisHardening()" style="width:180px;"><option value="">Todos</option><option value="entrada">Entradas NF</option><option value="mov">Movimentos estoque</option><option value="saida">Saidas/vendas</option></select>
      </div>
      <div class="op-table-wrap"><table class="op-table"><thead><tr><th>Tipo</th><th>Documento</th><th>Fornecedor/Cliente</th><th>Data</th><th>Valor/Qtd</th><th>Vinculos</th><th>Acoes</th></tr></thead><tbody id="tbDocsFiscais"></tbody></table></div>`;
    sec.prepend(panel);
    ensureFiscalModal();
  }
  function renderDocsFiscais() {
    const tb = byId('tbDocsFiscais');
    if (!tb) return;
    const q = norm(byId('fiscalDocBusca')?.value || '');
    const tipoFiltro = byId('fiscalDocTipo')?.value || '';
    const notas = (J().notasFiscaisEntrada || []).map(n => ({ kind:'entrada', doc:n, texto:[n.numero,n.chave,n.fornecedorSnapshot?.nome,n.fornecedorNome,n.totalNF].join(' ') }));
    const movs = (J().estoqueMovimentos || []).map(m => ({ kind:'mov', doc:m, texto:[m.tipo,m.nfNumero,m.desc,m.codigo,m.placa,m.osId].join(' ') }));
    const vendas = (J().vendasAutopecas || []).map(v => ({ kind:'saida', doc:v, texto:[v.clienteNome,v.id,v.pagamento,(v.itens||[]).map(i=>i.desc).join(' ')].join(' ') }));
    const rows = notas.concat(movs, vendas).filter(r => (!tipoFiltro || r.kind === tipoFiltro) && (!q || norm(r.texto).includes(q)));
    tb.innerHTML = rows.slice(0,160).map(r => {
      const d = r.doc;
      if (r.kind === 'entrada') {
        const vinc = (J().nfItensVinculos || []).filter(x => x.nfId === d.id);
        return `<tr><td><span class="op-chip ok">Entrada NF</span></td><td><b>NF ${esc(d.numero || '-')}</b><br><small>${esc(d.chave || '')}</small></td><td>${esc(d.fornecedorSnapshot?.nome || d.fornecedorNome || '-')}</td><td>${esc(d.dataNF || d.createdAt || '-')}</td><td>${moeda(d.totalNF || d.totalItens || 0)}<br><small>${(d.itens||[]).length} item(ns)</small></td><td>${vinc.filter(x=>x.osId||x.placa).length} vinculo(s)<br><small>${vinc.filter(x=>x.estoqueBaixadoAutomatico).length} baixa(s) auto</small></td><td><button class="btn-ghost" onclick="window.editarDocFiscal('${esc(d.id)}')">EDITAR</button></td></tr>`;
      }
      if (r.kind === 'saida') {
        return `<tr><td><span class="op-chip">Saida/venda</span></td><td><b>${esc(String(d.id||'').slice(-6).toUpperCase())}</b></td><td>${esc(d.clienteNome || '-')}</td><td>${esc(d.data || d.createdAt || '-')}</td><td>${moeda(d.total || 0)}<br><small>${(d.itens||[]).length} item(ns)</small></td><td>${esc(d.canal || '')}</td><td>-</td></tr>`;
      }
      return `<tr><td><span class="op-chip warn">${esc(d.tipo || 'Movimento')}</span></td><td>${esc(d.nfNumero || d.nfId || '-')}</td><td>${esc(d.fornecedorId || '-')}</td><td>${esc(d.createdAt || '-')}</td><td>${esc(d.qtd || 0)}<br><small>${moeda(d.total || 0)}</small></td><td>${esc(d.placa || '')} ${d.osId ? 'OS #' + esc(String(d.osId).slice(-6).toUpperCase()) : ''}<br>${esc(d.desc || '')}</td><td>-</td></tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:18px;">Nenhum documento fiscal/movimento encontrado.</td></tr>';
  }
  W.renderDocsFiscaisHardening = renderDocsFiscais;
  function ensureFiscalModal() {
    if (byId('modalFiscalDocHardening')) return;
    D.body.insertAdjacentHTML('beforeend', `<div class="overlay" id="modalFiscalDocHardening"><div class="modal" style="max-width:620px;"><div class="modal-head"><div class="modal-title">CONFERIR / EDITAR NF</div><button class="modal-close" onclick="fecharModal('modalFiscalDocHardening')">x</button></div><div class="modal-body"><input type="hidden" id="fdId"><div class="form-row cols-2"><div class="form-group"><label class="j-label">Numero</label><input class="j-input" id="fdNumero"></div><div class="form-group"><label class="j-label">Data</label><input type="date" class="j-input" id="fdData"></div></div><div class="form-row cols-2"><div class="form-group"><label class="j-label">Fornecedor</label><select class="j-select" id="fdFornecedor"></select></div><div class="form-group"><label class="j-label">Status conferencia</label><select class="j-select" id="fdStatus"><option>Conferida</option><option>Pendente</option><option>Divergencia</option></select></div></div><div class="form-group"><label class="j-label">Observacao</label><textarea class="j-input" id="fdObs" rows="3"></textarea></div><div id="fdResumoItens" style="font-size:.72rem;color:var(--muted);"></div></div><div class="modal-foot"><button class="btn-ghost" onclick="fecharModal('modalFiscalDocHardening')">CANCELAR</button><button class="btn-primary" onclick="window.salvarDocFiscalHardening()">SALVAR</button></div></div></div>`);
  }
  W.editarDocFiscal = function (id) {
    const n = (J().notasFiscaisEntrada || []).find(x => x.id === id);
    if (!n) return;
    ensureFiscalModal();
    byId('fdId').value = id;
    byId('fdNumero').value = n.numero || '';
    byId('fdData').value = n.dataNF || '';
    byId('fdObs').value = n.obsConferencia || n.observacao || '';
    byId('fdStatus').value = n.statusConferencia || 'Pendente';
    byId('fdFornecedor').innerHTML = '<option value="">Fornecedor XML/snapshot</option>' + (J().fornecedores || []).map(f => `<option value="${esc(f.id)}" ${n.fornecedorId===f.id?'selected':''}>${esc(f.nome || f.razaoSocial || f.id)}</option>`).join('');
    const vinculos = (J().nfItensVinculos || []).filter(v => v.nfId === id || (n.chave && v.chave === n.chave) || (n.numero && v.nfNumero === n.numero));
    const fins = (J().financeiro || []).filter(f => f.notaFiscalId === id || f.nfId === id || (n.chave && f.chaveNFe === n.chave) || (n.numero && String(f.desc || '').includes('NF ' + n.numero)));
    byId('fdResumoItens').innerHTML = `
      <div style="border:1px solid var(--border);border-radius:4px;padding:10px;margin:8px 0;background:var(--surf2);">
        <b>Espelho fiscal bloqueado para edicao livre</b><br>
        Chave: ${esc(n.chave || '-')}<br>
        Serie: ${esc(n.serie || '-')} | Natureza: ${esc(n.natureza || '-')} | Total NF: ${moeda(n.totalNF || n.totalItens || 0)}<br>
        A nota XML deve ser preservada. Edite apenas conferencia, vinculos internos, estoque e financeiro com auditoria.
      </div>
      <div class="op-table-wrap" style="margin-top:8px;"><table class="op-table"><thead><tr><th>Codigo</th><th>Descricao</th><th>NCM/CFOP/CEST</th><th>Qtd</th><th>Custo</th><th>Destino</th></tr></thead><tbody>
        ${(n.itens || []).slice(0,80).map(i => `<tr><td>${esc(i.codigoFornecedor || i.codigo || '')}<br><small>${esc(i.codigoComercial || i.oem || '')}</small></td><td>${esc(i.descricao || i.desc || '')}<br><small>${esc(i.marca || '')}</small></td><td>${esc(i.ncm || '-')} / ${esc(i.cfop || '-')} / ${esc(i.cest || '-')}</td><td>${esc(i.quantidade || i.qtd || 1)}</td><td>${moeda(i.valorUnitario || i.custo || 0)}</td><td>${esc(i.destino || i.finalidade || 'estoque')} ${esc(i.placa || i.vinculo || '')}</td></tr>`).join('') || '<tr><td colspan="6">Sem itens registrados.</td></tr>'}
      </tbody></table></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
        <div style="border:1px solid var(--border);border-radius:4px;padding:10px;background:var(--surf2);"><b>Vinculos / baixas</b><br>${vinculos.slice(0,40).map(v=>`- ${esc(v.codigoFornecedor || v.codigo || '')} ${esc(v.desc || '')} | ${esc(v.placa || '-')} ${v.osId ? 'OS #' + esc(String(v.osId).slice(-6).toUpperCase()) : ''} | baixa: ${v.estoqueBaixadoAutomatico?'sim':'nao'}`).join('<br>') || 'Nenhum vinculo registrado.'}</div>
        <div style="border:1px solid var(--border);border-radius:4px;padding:10px;background:var(--surf2);"><b>Financeiro da NF</b><br>${fins.slice(0,40).map(f=>`- ${esc(f.desc || f.id)} | ${moeda(f.valor || 0)} | ${esc(f.venc || '')} | ${esc(f.status || '')}${f.pacoteBoletoNumero ? ' | pacote ' + esc(f.pacoteBoletoNumero) : ''}`).join('<br>') || 'Nenhum lancamento vinculado.'}</div>
      </div>`;
    W.abrirModal?.('modalFiscalDocHardening');
  };
  W.salvarDocFiscalHardening = async function () {
    const id = byId('fdId')?.value;
    if (!id || !db()) return;
    await db().collection('notas_fiscais_entrada').doc(id).update({ numero:byId('fdNumero').value, dataNF:byId('fdData').value, fornecedorId:byId('fdFornecedor').value || '', statusConferencia:byId('fdStatus').value, obsConferencia:byId('fdObs').value, updatedAt:new Date().toISOString() });
    toast('NF atualizada para conferencia.', 'ok');
    W.fecharModal?.('modalFiscalDocHardening');
  };

  function installPacotesPanel() {
    const sec = byId('s-financeiro');
    if (!sec || byId('pacotesBoletosPanel')) return;
    const p = D.createElement('div');
    p.id = 'pacotesBoletosPanel';
    p.className = 'op-card';
    p.innerHTML = `
      <div class="op-title">PACOTES DE BOLETOS / DUPLICATAS DE FORNECEDOR</div>
      <div style="display:grid;grid-template-columns:minmax(180px,1fr) 140px 140px auto auto;gap:8px;align-items:end;margin-bottom:8px;">
        <div class="form-group"><label class="j-label">Fornecedor</label><select class="j-select" id="pkgFornecedor"></select></div>
        <div class="form-group"><label class="j-label">Inicio</label><input type="date" class="j-input" id="pkgInicio"></div>
        <div class="form-group"><label class="j-label">Fim</label><input type="date" class="j-input" id="pkgFim"></div>
        <button class="btn-outline" onclick="window.previewPacoteBoletosHardening()">PREVISUALIZAR</button>
        <button class="btn-primary" onclick="window.criarPacoteBoletosHardening()">CRIAR PACOTE</button>
      </div>
      <div id="pkgPreview" style="display:none;border:1px solid var(--border);background:var(--surf2);border-radius:4px;padding:10px;margin-bottom:8px;font-size:.72rem;"></div>
      <div class="op-table-wrap"><table class="op-table"><thead><tr><th>Pacote</th><th>Fornecedor</th><th>Periodo</th><th>Titulos</th><th>Total</th><th>Status</th><th>Acoes</th></tr></thead><tbody id="tbPacotesBoletos"></tbody></table></div>`;
    sec.prepend(p);
    setTimeout(renderPacotesBoletos, 100);
  }
  function renderPacotesBoletos() {
    const sel = byId('pkgFornecedor');
    if (sel) sel.innerHTML = '<option value="">Todos fornecedores</option>' + (J().fornecedores || []).map(f => `<option value="${esc(f.id)}">${esc(f.nome || f.razaoSocial || f.id)}</option>`).join('');
    const tb = byId('tbPacotesBoletos');
    if (!tb) return;
    tb.innerHTML = (J().pacotesBoletos || []).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))).map(p => {
      const fechado = /fechado|pago|baixado/i.test(String(p.status || ''));
      return `<tr><td><b>${esc(p.numero || String(p.id||'').slice(-6).toUpperCase())}</b></td><td>${esc(p.fornecedorNome || p.fornecedorId || '-')}</td><td>${esc(p.inicio || '-')} a ${esc(p.fim || '-')}</td><td>${(p.titulos || []).length}</td><td>${moeda(p.total || 0)}</td><td><span class="op-chip ${fechado?'ok':'warn'}">${esc(p.status || 'Aberto')}</span></td><td><button class="btn-ghost" onclick="window.verTitulosPacoteBoletos('${esc(p.id)}')">VER</button>${fechado?'':`<button class="btn-outline" onclick="window.baixarPacoteBoletosHardening('${esc(p.id)}')" style="margin-left:4px;">BAIXAR</button>`}</td></tr>`;
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:18px;">Nenhum pacote criado.</td></tr>';
  }
  function titulosElegiveisPacote() {
    const fornecedorId = byId('pkgFornecedor')?.value || '';
    const ini = byId('pkgInicio')?.value || todayISO();
    const fim = byId('pkgFim')?.value || ini;
    return (J().financeiro || []).filter(f => {
      const isSaida = /saida|despesa|pagar/.test(norm(f.tipo || ''));
      const status = norm(f.status);
      const venc = String(f.venc || f.vencimento || '').slice(0,10);
      const boleto = /(boleto|duplicata|nf|fornecedor|parcelado)/i.test([f.pgto,f.desc,f.categoria,f.origem].join(' '));
      const fornOk = !fornecedorId || f.fornecedorId === fornecedorId || String(f.vinculo || '') === 'F_' + fornecedorId;
      return isSaida && boleto && fornOk && venc >= ini && venc <= fim && !/pago|liquidado|cancelado/.test(status) && !f.pacoteBoletoId;
    });
  }
  W.previewPacoteBoletosHardening = function () {
    const box = byId('pkgPreview');
    if (!box) return;
    const lista = titulosElegiveisPacote();
    box.style.display = 'block';
    const total = lista.reduce((s,f)=>s+num(f.valor),0);
    box.innerHTML = `<b>${lista.length} titulo(s) elegivel(is) - ${moeda(total)}</b><br>` +
      (lista.length ? lista.slice(0,40).map(f=>`- ${esc(f.desc || f.id)} | venc. ${esc(f.venc || f.vencimento || '-')} | ${moeda(f.valor || 0)}`).join('<br>') : 'Nenhum boleto/duplicata aberto nesse periodo ou todos ja estao em pacote.');
  };
  W.verTitulosPacoteBoletos = function (id) {
    const p = (J().pacotesBoletos || []).find(x => x.id === id);
    const box = byId('pkgPreview');
    if (!p || !box) return;
    box.style.display = 'block';
    box.innerHTML = `<b>${esc(p.numero || p.id)} - ${esc(p.status || 'Aberto')} - ${moeda(p.total || 0)}</b><br>` +
      ((p.titulos || []).map(t => `- ${esc(t.desc || t.id)} | venc. ${esc(t.venc || '-')} | ${moeda(t.valor || 0)}`).join('<br>') || 'Sem titulos no pacote.');
  };
  W.criarPacoteBoletosHardening = async function () {
    const fornecedorId = byId('pkgFornecedor')?.value || '';
    const ini = byId('pkgInicio')?.value || todayISO();
    const fim = byId('pkgFim')?.value || ini;
    const aberto = (J().financeiro || []).filter(f => {
      const isSaida = /saida|despesa|pagar/.test(norm(f.tipo || ''));
      const status = norm(f.status);
      const venc = String(f.venc || f.vencimento || '').slice(0,10);
      const boleto = /(boleto|duplicata|nf|fornecedor|parcelado)/i.test([f.pgto,f.desc,f.categoria,f.origem].join(' '));
      const fornOk = !fornecedorId || f.fornecedorId === fornecedorId || String(f.vinculo || '') === 'F_' + fornecedorId;
      return isSaida && boleto && fornOk && venc >= ini && venc <= fim && !/pago|liquidado|cancelado/.test(status) && !f.pacoteBoletoId;
    });
    if (!aberto.length) { toast('Nenhum boleto/duplicata aberto nesse periodo.', 'warn'); return; }
    const fornecedor = (J().fornecedores || []).find(f => f.id === fornecedorId) || {};
    const total = aberto.reduce((s,f)=>s+num(f.valor),0);
    const ref = db().collection('pacotes_boletos').doc();
    const numero = `PCT-${todayISO().replace(/-/g,'')}-${String(ref.id).slice(-4).toUpperCase()}`;
    const batch = db().batch();
    batch.set(ref, { tenantId:J().tid, numero, fornecedorId, fornecedorNome:fornecedor.nome || fornecedor.razaoSocial || '', inicio:ini, fim, titulos:aberto.map(f=>({id:f.id, desc:f.desc, valor:num(f.valor), venc:f.venc||f.vencimento||''})), total, status:'Aberto', createdAt:new Date().toISOString(), usuario:J().nome || 'Sistema' });
    aberto.forEach(f => batch.update(db().collection('financeiro').doc(f.id), { pacoteBoletoId:ref.id, pacoteBoletoNumero:numero, updatedAt:new Date().toISOString() }));
    await batch.commit();
    toast(`Pacote ${numero} criado com ${aberto.length} titulo(s).`, 'ok');
  };
  W.baixarPacoteBoletosHardening = async function (id) {
    const p = (J().pacotesBoletos || []).find(x => x.id === id);
    if (!p || !db()) return;
    const forma = prompt('Forma de pagamento da baixa do pacote:', 'PIX') || 'PIX';
    const dataBaixa = prompt('Data da baixa (YYYY-MM-DD):', todayISO()) || todayISO();
    const motivo = prompt('Observacao/comprovante da baixa:', 'Baixa de pacote de boletos') || 'Baixa de pacote de boletos';
    const batch = db().batch();
    (p.titulos || []).forEach(t => {
      if (t.id) batch.update(db().collection('financeiro').doc(t.id), { status:'Pago', pgto:forma, dataBaixa, baixaPacoteEm:new Date().toISOString(), baixaPacotePor:J().nome || 'Sistema', baixaPacoteObs:motivo, updatedAt:new Date().toISOString() });
    });
    batch.update(db().collection('pacotes_boletos').doc(id), { status:'Fechado', formaBaixa:forma, dataBaixa, obsBaixa:motivo, fechadoEm:new Date().toISOString(), fechadoPor:J().nome || 'Sistema', updatedAt:new Date().toISOString() });
    await batch.commit();
    toast(`Pacote ${p.numero || id} baixado e titulos marcados como pagos.`, 'ok');
  };

  function overrideEstoqueFornecedores() {
    W.renderEstoque = function () {
      const tb = byId('tbEstoque'); if (!tb) return;
      tb.innerHTML = (J().estoque || []).map(p => {
        const crit = num(p.qtd) <= num(p.min);
        return `<tr class="${crit?'stock-critical':''}"><td style="font-family:var(--fm);font-size:.75rem;color:var(--muted)">${esc(p.codigo||p.codigoFornecedor||'-')}</td><td><strong>${esc(p.desc||p.descricao||'-')}</strong><br><small>${esc([p.marca,p.ncm,p.cfop].filter(Boolean).join(' | '))}</small></td><td style="font-family:var(--fm)">${moeda(p.custo)}</td><td style="font-family:var(--fm);color:var(--success)">${moeda(p.venda)}</td><td style="font-family:var(--fm);font-weight:700;color:${crit?'var(--danger)':'var(--text)'}">${esc(p.qtd||0)}</td><td style="font-family:var(--fm);color:var(--muted)">${esc(p.min||0)}</td><td>${crit?'<span class="pill pill-danger">CRITICO</span>':'<span class="pill pill-green">OK</span>'}</td><td><button class="btn-ghost" onclick="window.prepPeca && window.prepPeca('edit','${esc(p.id)}');abrirModal('modalPeca')">EDITAR</button><button class="btn-danger" onclick="window.excluirPecaDef && window.excluirPecaDef('${esc(p.id)}')" style="margin-left:4px;">EXCLUIR</button></td></tr>`;
      }).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:20px;">Nenhum item</td></tr>';
    };
    W.prepFornec = function (mode, id) {
      if (arguments.length === 1) { id = mode; mode = id ? 'edit' : 'add'; }
      ['fornecId','fornecNome','fornecSeg','fornecWpp'].forEach(f => { const el = byId(f); if (el) el.value=''; });
      if (mode === 'edit' && id) {
        const f = (J().fornecedores || []).find(x => x.id === id); if (!f) return;
        if (byId('fornecId')) byId('fornecId').value = f.id;
        if (byId('fornecNome')) byId('fornecNome').value = f.nome || f.razaoSocial || f.razao || '';
        if (byId('fornecSeg')) byId('fornecSeg').value = f.segmento || f.cidade || '';
        if (byId('fornecWpp')) byId('fornecWpp').value = f.wpp || f.telefone || '';
      }
    };
    W.renderFornecedores = function () {
      const tb = byId('tbFornec'); if (!tb) return;
      tb.innerHTML = (J().fornecedores || []).map(f => `<tr><td><strong>${esc(f.nome || f.razaoSocial || '-')}</strong><br><small>${esc(f.cnpj || f.doc || '')}</small></td><td>${esc(f.segmento || '-')}<br><small>${esc([f.cidade,f.uf].filter(Boolean).join('/'))}</small></td><td>${esc(f.wpp || f.telefone || '-')}</td><td><button class="btn-ghost" onclick="window.prepFornec('edit','${esc(f.id)}');abrirModal('modalFornec')">EDITAR</button><button class="btn-danger" onclick="window.excluirFornecedorDef && window.excluirFornecedorDef('${esc(f.id)}')" style="margin-left:4px;">EXCLUIR</button></td></tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:18px;">Nenhum fornecedor cadastrado</td></tr>';
    };
  }

  function corrigirPagamentoOS() {
    const forma = byId('osPgtoForma')?.value || '';
    const parcelas = byId('osPgtoParcelas');
    if (!parcelas) return;
    if (!/(boleto|crediario|crediário|credito|crédito|parcel)/i.test(forma)) parcelas.value = '1';
  }
  function wrapSalvarOS() {
    const old = W.salvarOS;
    if (typeof old !== 'function' || old._hardeningPgto) return;
    const wrapped = async function () {
      corrigirPagamentoOS();
      return old.apply(this, arguments);
    };
    wrapped._hardeningPgto = true;
    W.salvarOS = wrapped;
    D.addEventListener('change', e => { if (e.target?.id === 'osPgtoForma') corrigirPagamentoOS(); });
  }

  function installOrcamentoAuto() {
    const cont = byId('containerServicosOS');
    if (!cont || byId('orcamentoAutoBarOS')) return;
    const bar = D.createElement('div');
    bar.id = 'orcamentoAutoBarOS';
    bar.setAttribute('data-module', 'orcamentoAutomatizado');
    bar.className = 'op-card';
    bar.innerHTML = `<div class="op-title">ORCAMENTO AUTOMATIZADO</div><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;"><button type="button" id="btnOrcamentoAutomatizadoOS" class="btn-primary" onclick="window.gerarOrcamentoAutomatizadoOS()">ANALISAR PECAS / RELATO E SUGERIR SERVICOS</button><span style="font-family:var(--fm);font-size:.62rem;color:var(--muted);">Nao apaga nada: apenas cria sugestoes deterministicas e usa a Temparia quando encontrar correspondencia.</span></div>`;
    cont.parentElement?.insertBefore(bar, cont);
    W.thiaApplyModuleVisibility?.(D);
  }
  function termosPecasOS() {
    return Array.from(D.querySelectorAll('#containerPecasOS .peca-desc-livre, #containerPecasOS .peca-sel option:checked')).map(el => el.value || el.textContent || '').filter(Boolean);
  }
  function servicoJaExiste(desc) {
    const n = norm(desc);
    return Array.from(D.querySelectorAll('#containerServicosOS .serv-desc')).some(el => norm(el.value).includes(n) || n.includes(norm(el.value)));
  }
  function regraServicos(txt) {
    const regras = [
      { rx:/pastilha|disco|freio|sapata|cilindro|pinca|pinça/, serv:['Inspecao e reparo do sistema de freio','Sangria/teste do sistema de freio'] },
      { rx:/amortec|batente|coifa|mola|bandeja|pivo|pivô|bieleta|coxim/, serv:['Diagnostico e substituicao de componentes da suspensao','Alinhamento apos servico de suspensao'] },
      { rx:/bateria|alternador|arranque|motor de partida|lampada|lâmpada|farol|sensor/, serv:['Diagnostico eletrico e teste de carga'] },
      { rx:/bomba combust|filtro|oleo|óleo|vela|correia|motor/, serv:['Diagnostico do sistema de motor/alimentacao'] },
      { rx:/radiador|ventoinha|reservatorio|mangueira|agua|arrefecimento/, serv:['Diagnostico e reparo do sistema de arrefecimento'] },
      { rx:/embreagem|cambio|câmbio|homocinet|semieixo/, serv:['Diagnostico do sistema de transmissao'] },
      { rx:/pneu|roda|cubo|rolamento/, serv:['Balanceamento/conferencia de rodas e cubos'] }
    ];
    const out = [];
    regras.forEach(r => { if (r.rx.test(txt)) out.push(...r.serv); });
    return [...new Set(out)];
  }
  W.gerarOrcamentoAutomatizadoOS = async function () {
    if (!modEnabled('orcamentoAutomatizado')) { toast('Modulo de orcamento automatizado bloqueado pelo Superadmin.', 'warn'); return; }
    const texto = norm([byId('osDesc')?.value, byId('osDiagnostico')?.value, byId('osRelato')?.value, termosPecasOS().join(' ')].join(' '));
    if (!texto) { toast('Inclua relato, diagnostico ou pecas para analisar.', 'warn'); return; }
    const sugestoes = regraServicos(texto).filter(s => !servicoJaExiste(s));
    if (!sugestoes.length) { toast('Nao encontrei nova sugestao segura pelas regras locais.', 'warn'); return; }
    if (typeof W.tempaCarregar === 'function') { try { await W.tempaCarregar(); } catch (_) {} }
    sugestoes.forEach(desc => {
      W.adicionarServicoOS?.();
      const row = D.querySelector('#containerServicosOS > div:last-child');
      if (!row) return;
      const descEl = row.querySelector('.serv-desc');
      if (descEl) descEl.value = desc;
      const achados = typeof W.tempaBuscarPorTexto === 'function' ? (W.tempaBuscarPorTexto(desc, { limite:3, preciso:true }) || []) : [];
      const it = achados[0];
      if (it) {
        row.dataset.codigoTabela = it.codigo || it.cod || '';
        row.dataset.sistemaTabela = it.sistema || it.grupo || '';
        const tempo = row.querySelector('.serv-tempo'); if (tempo && (it.tempo || it.tmo)) tempo.value = String(it.tempo || it.tmo).replace('.', ',');
        const servDesc = row.querySelector('.serv-desc'); if (servDesc && it.item) servDesc.value = it.item;
      }
    });
    W.calcOSTotal?.();
    toast(`${sugestoes.length} servico(s) sugerido(s) sem apagar o orcamento atual.`, 'ok');
  };

  function extendIALocal() {
    if (W.thiaResponderLocal?._hardeningLocal) return;
    const old = W.thiaResponderLocal;
    W.thiaResponderLocal = function (pergunta) {
      const base = typeof old === 'function' ? old(pergunta) : null;
      if (base) return base;
      const q = norm(pergunta);
      const fin = J().financeiro || [];
      if (/boleto|conta|titulo|duplicata|venc/.test(q) && /hoje/.test(q)) {
        const hoje = todayISO();
        const lista = fin.filter(f => {
          const venc = String(f.venc || f.vencimento || '').slice(0,10);
          const status = norm(f.status);
          const ehBoleto = /(boleto|duplicata|nf|fornecedor|titulo|pagar|receber)/i.test([f.pgto,f.forma,f.desc,f.categoria,f.origem,f.tipo].join(' '));
          return venc === hoje && ehBoleto && !/pago|liquidado|cancelado/.test(status);
        });
        if (!lista.length) return 'Nao ha boleto/duplicata vencendo hoje nos dados carregados deste tenant.';
        const total = lista.reduce((s,f)=>s+num(f.valor),0);
        return `Boletos/duplicatas vencendo hoje (${lista.length}) - total ${moeda(total)}:<br>${lista.slice(0,30).map(f=>`- ${esc(f.desc || f.id)} | ${moeda(f.valor)} | ${esc(f.fornecedorNome || f.clienteNome || f.vinculo || '-')} | status ${esc(f.status || 'Aberto')}`).join('<br>')}`;
      }
      if (/vencid|atrasad/.test(q) && /boleto|conta|titulo|duplicata|financeiro/.test(q)) {
        const hoje = todayISO();
        const lista = fin.filter(f => {
          const venc = String(f.venc || f.vencimento || '').slice(0,10);
          const status = norm(f.status);
          return venc && venc < hoje && !/pago|liquidado|cancelado/.test(status);
        });
        if (!lista.length) return 'Nao ha titulo vencido nos dados carregados deste tenant.';
        const total = lista.reduce((s,f)=>s+num(f.valor),0);
        return `Titulos vencidos (${lista.length}) - total ${moeda(total)}:<br>${lista.slice(0,30).map(f=>`- ${esc(f.desc || f.id)} | ${moeda(f.valor)} | venc. ${esc(f.venc || f.vencimento || '-')} | ${esc(f.fornecedorNome || f.clienteNome || f.vinculo || '-')}`).join('<br>')}`;
      }
      if (/resumo|contexto|dados.*oficina|tenant|oficina/.test(q) && /oficina|tenant|dados|geral|completo|resumo/.test(q)) {
        const estoqueCritico = (J().estoque || []).filter(p => num(p.qtd) <= num(p.min || p.minimo));
        const abertas = (J().os || []).filter(o => !/entreg|cancel|recus|finaliz/i.test(String(o.status || '')));
        return `Resumo local do tenant ${esc(J().tid || '-')}:<br>- O.S. carregadas: ${(J().os || []).length} (${abertas.length} abertas)<br>- Clientes: ${(J().clientes || []).length}<br>- Veiculos: ${(J().veiculos || []).length}<br>- Estoque: ${(J().estoque || []).length} itens (${estoqueCritico.length} criticos)<br>- Financeiro: ${fin.length} lancamentos<br>- NFs: ${(J().notasFiscaisEntrada || []).length}<br>- Vinculos NF/O.S.: ${(J().nfItensVinculos || []).length}<br>- Pacotes de boletos: ${(J().pacotesBoletos || []).length}`;
      }
      if (/pix|parcel/.test(q)) {
        const suspeitos = fin.filter(f => /pix/i.test(String(f.pgto || f.forma || '')) && (/\(\d+\/\d+\)/.test(String(f.desc || '')) || num(f.pgtoParcelas) > 1));
        if (suspeitos.length) return `Encontrei possivel inconsistencia: recebimento PIX parcelado em ${suspeitos.length} lancamento(s).<br>${suspeitos.slice(0,12).map(f=>`- ${esc(f.desc||'-')} | ${moeda(f.valor)} | ${esc(f.venc||'')}`).join('<br>')}<br><br>Regra correta: PIX/Dinheiro/Debito sempre 1 lancamento pago.`;
        return 'Nao encontrei PIX parcelado nos dados carregados.';
      }
      if (/nota fiscal|\bnf\b|xml|fornecedor/.test(q)) {
        const docs = (J().notasFiscaisEntrada || []).filter(n => !q || norm([n.numero,n.chave,n.fornecedorSnapshot?.nome,n.fornecedorNome].join(' ')).includes(q.replace(/\bnf\b/g,'').trim()) || /nota fiscal|\bnf\b|xml/.test(q));
        if (!docs.length) return 'Nao ha nota fiscal carregada/localizada para essa pergunta.';
        return `Notas fiscais carregadas:<br>${docs.slice(0,15).map(n=>`- NF ${esc(n.numero||'-')} | ${esc(n.fornecedorSnapshot?.nome||n.fornecedorNome||'-')} | ${esc(n.dataNF||'-')} | ${moeda(n.totalNF||n.totalItens||0)} | ${(n.itens||[]).length} item(ns)`).join('<br>')}`;
      }
      if (/pacote.*boleto|boletos.*pacote/.test(q)) {
        const pac = J().pacotesBoletos || [];
        if (!pac.length) return 'Nao ha pacote de boletos criado.';
        return `Pacotes de boletos:<br>${pac.slice(0,15).map(p=>`- ${esc(p.numero||p.id)} | ${esc(p.fornecedorNome||'-')} | ${esc(p.inicio||'-')} a ${esc(p.fim||'-')} | ${moeda(p.total||0)} | ${(p.titulos||[]).length} titulo(s)`).join('<br>')}`;
      }
      if (/onde.*peca|historico.*peca|estoque.*peca|usada/.test(q)) {
        const termo = q.replace(/onde|peca|peça|historico|estoque|usada|foi|em|qual/g,'').trim();
        const vinc = (J().nfItensVinculos || []).filter(v => norm([v.desc,v.codigo,v.codigoFornecedor,v.codigoComercial,v.placa,v.nfNumero].join(' ')).includes(termo));
        if (!vinc.length) return 'Nao ha vinculo de peca localizado nos dados carregados.';
        return `Vinculos encontrados:<br>${vinc.slice(0,20).map(v=>`- ${esc(v.codigo||v.codigoFornecedor||'')} ${esc(v.desc||'-')} | NF ${esc(v.nfNumero||'-')} | ${esc(v.placa||'')} ${v.osId?'OS #'+esc(String(v.osId).slice(-6).toUpperCase()):''} | baixa auto: ${v.estoqueBaixadoAutomatico?'sim':'nao'}`).join('<br>')}`;
      }
      if (/ajuda|o que voce|o que consegue|comandos/.test(q)) {
        return 'Posso responder localmente sobre: boletos vencendo hoje, contas vencidas, estoque critico, O.S. por placa, notas fiscais importadas, pacotes de boletos, vinculos de pecas por NF/O.S., historico tecnico e inconsistencias de PIX parcelado. Quando faltar contexto, vou pedir placa, modelo, periodo ou cliente.';
      }
      return null;
    };
    W.thiaResponderLocal._hardeningLocal = true;
  }

  function isPixParceladoInconsistente(f) {
    const status = norm(f?.status);
    if (/cancel|estorn/.test(status)) return false;
    const forma = String(f?.pgto || f?.forma || f?.formaPagamento || '').toLowerCase();
    const desc = String(f?.desc || f?.descricao || '');
    return /pix/.test(forma) && (/\(\d+\s*\/\s*\d+\)/.test(desc) || num(f?.pgtoParcelas || f?.parcelas || 1) > 1);
  }

  function descSemMarcadorParcela(f) {
    return String(f?.desc || f?.descricao || '')
      .replace(/\s*\(\d+\s*\/\s*\d+\)\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function ordemParcelaPix(f) {
    const m = String(f?.desc || f?.descricao || '').match(/\((\d+)\s*\/\s*\d+\)/);
    return m ? parseInt(m[1], 10) || 999 : 999;
  }

  function chaveGrupoPixParcelado(f) {
    if (f?.notaFiscalId) return 'nf:' + f.notaFiscalId;
    if (f?.chaveNFe) return 'chave:' + f.chaveNFe;
    if (f?.osId) return 'os:' + f.osId;
    return 'desc:' + norm(descSemMarcadorParcela(f));
  }

  function grupoPixParcelado(f) {
    const chave = chaveGrupoPixParcelado(f);
    return (J().financeiro || [])
      .filter(x => isPixParceladoInconsistente(x) && chaveGrupoPixParcelado(x) === chave)
      .sort((a,b) => ordemParcelaPix(a) - ordemParcelaPix(b));
  }

  function installAuditoriaFinanceiraLocal() {
    W.thiaListarPixParcelado = function () {
      const lista = (J().financeiro || []).filter(isPixParceladoInconsistente);
      console.table(lista.map(f => ({
        id: f.id,
        desc: f.desc || f.descricao || '',
        valor: num(f.valor || 0),
        venc: f.venc || f.vencimento || '',
        status: f.status || '',
        pgto: f.pgto || f.forma || f.formaPagamento || '',
        parcelas: f.pgtoParcelas || f.parcelas || '',
        grupo: chaveGrupoPixParcelado(f),
        comando: `thiaCorrigirPixParcelado("${f.id}")`
      })));
      return lista;
    };
    W.thiaCorrigirPixParcelado = async function (id, motivo) {
      if (!id || !db()) { toast('Informe o ID do lancamento financeiro.', 'warn'); return false; }
      const f = (J().financeiro || []).find(x => x.id === id);
      if (!f) { toast('Lancamento nao encontrado nos dados carregados.', 'warn'); return false; }
      if (!isPixParceladoInconsistente(f)) { toast('Este lancamento nao parece PIX parcelado.', 'warn'); return false; }
      motivo = motivo || prompt('Motivo da correcao do PIX parcelado:', 'Correcao de inconsistencia: PIX nao deve gerar parcelas') || '';
      if (!motivo.trim()) { toast('Motivo obrigatorio para auditoria.', 'warn'); return false; }
      const grupo = grupoPixParcelado(f);
      const manter = grupo.find(x => ordemParcelaPix(x) === 1) || f;
      const cancelar = grupo.filter(x => x.id !== manter.id);
      const totalGrupo = grupo.reduce((s,x) => s + num(x.valor || 0), 0) || num(f.valor || 0);
      const descLimpa = descSemMarcadorParcela(manter) || descSemMarcadorParcela(f);
      const patch = {
        desc: descLimpa || f.desc || '',
        valor: totalGrupo,
        status: 'Pago',
        pgtoParcelas: 1,
        parcelas: 1,
        inconsistenciaFinanceiraCorrigida: true,
        pixParceladoConsolidado: grupo.length > 1,
        pixParceladoIdsConsolidados: grupo.map(x => x.id).filter(Boolean),
        corrigidoEm: new Date().toISOString(),
        corrigidoPor: J().nome || 'Jarvis',
        motivoCorrecao: motivo,
        updatedAt: new Date().toISOString()
      };
      await db().collection('financeiro').doc(manter.id).update(patch);
      Object.assign(manter, patch);
      for (const item of cancelar) {
        const cancelPatch = {
          status: 'Cancelado',
          canceladoPorConsolidacaoPixParcelado: true,
          pixParceladoConsolidadoEm: manter.id,
          valorAntesCancelamento: num(item.valor || 0),
          motivoCancelamento: motivo,
          updatedAt: new Date().toISOString()
        };
        await db().collection('financeiro').doc(item.id).update(cancelPatch);
        Object.assign(item, cancelPatch);
      }
      try {
        await db().collection('auditoria').add({
          tenantId: J().tid,
          usuario: J().nome || 'Jarvis',
          perfil: J().role || '',
          acao: 'correcao_pix_parcelado',
          entidade: 'financeiro',
          entidadeId: manter.id,
          antes: grupo,
          depois: { mantido: manter.id, atualizado: patch, cancelados: cancelar.map(x => x.id) },
          motivo,
          createdAt: new Date().toISOString(),
          ts: Date.now()
        });
      } catch (_) {}
      toast(`PIX corrigido com auditoria: ${grupo.length} lancamento(s) consolidado(s).`, 'ok');
      return true;
    };
    W.thiaCorrigirTodosPixParcelado = async function (motivo) {
      const lista = (J().financeiro || []).filter(isPixParceladoInconsistente);
      if (!lista.length) { toast('Nenhum PIX parcelado encontrado.', 'ok'); return 0; }
      motivo = motivo || prompt('Motivo da correcao em lote do PIX parcelado:', 'Correcao em lote: PIX nao deve gerar parcelas') || '';
      if (!motivo.trim()) { toast('Motivo obrigatorio para auditoria.', 'warn'); return 0; }
      const grupos = [];
      const vistos = new Set();
      lista.forEach(f => {
        const chave = chaveGrupoPixParcelado(f);
        if (vistos.has(chave)) return;
        vistos.add(chave);
        grupos.push(f.id);
      });
      for (const pixId of grupos) await W.thiaCorrigirPixParcelado(pixId, motivo);
      return grupos.length;
    };
  }

  function tick() {
    installCSS();
    wrapNFOpeners();
    ensureNFBatchTools();
    overrideAprovacaoOS();
    overrideHistoricoOS();
    installFiscalListeners();
    installDocsFiscaisPanel();
    installPacotesPanel();
    overrideEstoqueFornecedores();
    wrapSalvarOS();
    installOrcamentoAuto();
    extendIALocal();
    installAuditoriaFinanceiraLocal();
    W.thiaApplyModuleVisibility?.(D);
  }

  D.addEventListener('DOMContentLoaded', function () {
    tick();
    setTimeout(tick, 400);
    setTimeout(tick, 1200);
    setInterval(() => {
      if (J().tid && !W._hardeningFiscalListeners) installFiscalListeners();
      installOrcamentoAuto();
      ensureNFBatchTools();
    }, 2500);
  });
})();
