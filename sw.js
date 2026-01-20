// ===== SISTEMA DE SINCRONIZAÇÃO SIMPLIFICADO =====

// Elementos da interface
const sincronizarHTML = `
  <div style="margin-top:20px; border-top:1px solid rgba(0,0,0,0.1); padding-top:20px;">
    <h4>📱 Sincronização com Celular</h4>
    <div style="display: flex; flex-direction: column; gap: 10px;">
      <button id="btnSincronizarAgora" class="secondary">
        🔄 Sincronizar Agora
      </button>
      <button id="btnGerarQR" class="secondary">
        📱 Gerar QR Code
      </button>
      <button id="btnImportarBackup" class="secondary">
        📥 Importar Backup
      </button>
      <div id="syncStatus" style="font-size:0.8rem; padding:10px; background:var(--color-parchment); border-radius:8px; display:none;">
        <!-- Status será mostrado aqui -->
      </div>
    </div>
    <p style="font-size:0.8rem; margin-top:10px; color:var(--color-text-secondary);">
      Use o QR Code para transferir dados entre dispositivos
    </p>
  </div>
`;

// Adicionar interface na capa
function adicionarInterfaceSincronizacao() {
  const capaDiv = document.getElementById('capa');
  if (capaDiv) {
    capaDiv.insertAdjacentHTML('beforeend', sincronizarHTML);
    
    // Event Listeners
    document.getElementById('btnSincronizarAgora').addEventListener('click', sincronizarManual);
    document.getElementById('btnGerarQR').addEventListener('click', gerarQRCode);
    document.getElementById('btnImportarBackup').addEventListener('click', importarBackup);
  }
}

// Sincronização manual via Service Worker
async function sincronizarManual() {
  mostrarStatus('🔄 Iniciando sincronização...', 'loading');
  
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Usar background sync se disponível
      if ('sync' in registration) {
        await registration.sync.register('grimorio-sync');
        mostrarStatus('⏳ Sincronização agendada em background', 'loading');
      } else {
        // Fallback: comunicação direta
        await enviarDadosParaServiceWorker();
      }
    } catch (error) {
      console.error('Erro na sincronização:', error);
      mostrarStatus('❌ Erro na sincronização', 'error');
    }
  } else {
    mostrarStatus('⚠️ Sincronização offline não disponível', 'warning');
  }
}

// Enviar dados para Service Worker
async function enviarDadosParaServiceWorker() {
  return new Promise((resolve, reject) => {
    if (!navigator.serviceWorker.controller) {
      reject('Service Worker não disponível');
      return;
    }
    
    const messageChannel = new MessageChannel();
    
    messageChannel.port1.onmessage = (event) => {
      if (event.data.success) {
        mostrarStatus('✅ Dados sincronizados!', 'success');
        resolve();
      } else {
        mostrarStatus('❌ Erro na sincronização', 'error');
        reject(event.data.error);
      }
    };
    
    navigator.serviceWorker.controller.postMessage(
      { type: 'SYNC_REQUEST' },
      [messageChannel.port2]
    );
  });
}

// Gerar QR Code com dados
function gerarQRCode() {
  // Coletar todos os dados
  const todosDados = {};
  for (let i = 0; i < localStorage.length; i++) {
    const chave = localStorage.key(i);
    todosDados[chave] = localStorage.getItem(chave);
  }
  
  // Comprimir dados para URL menor
  const dadosString = JSON.stringify(todosDados);
  const dadosCodificados = btoa(encodeURIComponent(dadosString));
  
  // Criar URL para o QR Code
  const url = `${window.location.origin}${window.location.pathname}?import=${dadosCodificados}`;
  
  // Criar modal com QR Code
  const modalHTML = `
    <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; z-index:9999;">
      <div style="background:white; padding:30px; border-radius:20px; text-align:center; max-width:90%;">
        <h3 style="color:var(--color-transformative-teal); margin-bottom:20px;">📱 QR Code para Celular</h3>
        
        <div id="qrcodeContainer" style="margin:20px auto; width:250px; height:250px;"></div>
        
        <p style="font-size:0.9rem; color:#666; margin:20px 0;">
          1. Abra o app no celular<br>
          2. Toque em "Importar Backup"<br>
          3. Escaneie este QR Code
        </p>
        
        <div style="display:flex; gap:10px; justify-content:center;">
          <button onclick="copiarLink()" class="secondary" style="padding:10px 20px;">
            📋 Copiar Link
          </button>
          <button onclick="fecharModal()" style="background:var(--color-sunset-amber); color:white; border:none; padding:10px 20px; border-radius:10px; cursor:pointer;">
            Fechar
          </button>
        </div>
      </div>
    </div>
  `;
  
  const modalDiv = document.createElement('div');
  modalDiv.innerHTML = modalHTML;
  modalDiv.id = 'modalQR';
  document.body.appendChild(modalDiv);
  
  // Gerar QR Code
  setTimeout(() => {
    if (typeof QRCode !== 'undefined') {
      new QRCode(document.getElementById("qrcodeContainer"), {
        text: url,
        width: 250,
        height: 250,
        colorDark: "#2a7a7a",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, 100);
  
  // Adicionar função global para copiar
  window.copiarLink = function() {
    navigator.clipboard.writeText(url)
      .then(() => alert('✅ Link copiado! Cole no celular.'))
      .catch(() => alert('❌ Não foi possível copiar'));
  };
  
  window.fecharModal = function() {
    document.getElementById('modalQR').remove();
  };
}

// Importar backup (para ler QR Code do celular)
function importarBackup() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,.txt';
  
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const dados = JSON.parse(event.target.result);
        
        if (confirm(`Importar ${Object.keys(dados).length} itens?`)) {
          localStorage.clear();
          
          for (const [chave, valor] of Object.entries(dados)) {
            localStorage.setItem(chave, valor);
          }
          
          mostrarStatus('✅ Dados importados! Recarregando...', 'success');
          setTimeout(() => location.reload(), 1500);
        }
      } catch (error) {
        alert('❌ Arquivo inválido. Use um backup .json do Grimório.');
      }
    };
    
    reader.readAsText(file);
  };
  
  input.click();
}

// Mostrar status na interface
function mostrarStatus(mensagem, tipo = 'info') {
  const statusDiv = document.getElementById('syncStatus');
  if (statusDiv) {
    statusDiv.textContent = mensagem;
    statusDiv.style.display = 'block';
    
    // Cores
    const cores = {
      loading: 'linear-gradient(135deg, #2a7a7a, #0d2b2e)',
      success: 'linear-gradient(135deg, #2a7a7a, #1a5a5a)',
      error: 'linear-gradient(135deg, #ff8a50, #e67a3a)',
      warning: 'linear-gradient(135deg, #ffb74d, #f57c00)',
      info: 'var(--color-parchment)'
    };
    
    statusDiv.style.background = cores[tipo] || cores.info;
    statusDiv.style.color = tipo === 'info' ? 'var(--color-text-secondary)' : 'white';
    
    // Auto-esconder
    if (tipo === 'success' || tipo === 'error') {
      setTimeout(() => {
        statusDiv.style.display = 'none';
      }, 5000);
    }
  }
}

// Escutar mensagens do Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', event => {
    const { type, data } = event.data;
    
    if (type === 'SYNC_DATA_AVAILABLE') {
      console.log('📥 Dados recebidos do Service Worker:', data);
      mostrarStatus('🔄 Dados recebidos de outra aba', 'info');
    }
    
    if (type === 'REQUEST_DATA_FOR_SYNC') {
      // Responder ao Service Worker com os dados
      const todosDados = {};
      for (let i = 0; i < localStorage.length; i++) {
        const chave = localStorage.key(i);
        todosDados[chave] = localStorage.getItem(chave);
      }
      
      event.ports[0].postMessage({
        success: true,
        data: todosDados
      });
    }
  });
}

// Verificar se há dados para importar na URL (do QR Code)
function verificarImportacaoURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const dadosImport = urlParams.get('import');
  
  if (dadosImport) {
    try {
      const dadosString = decodeURIComponent(atob(dadosImport));
      const dados = JSON.parse(dadosString);
      
      if (confirm(`📥 Encontrados dados para importar (${Object.keys(dados).length} itens). Deseja importar?`)) {
        localStorage.clear();
        
        for (const [chave, valor] of Object.entries(dados)) {
          localStorage.setItem(chave, valor);
        }
        
        // Limpar URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        mostrarStatus('✅ Dados importados! Recarregando...', 'success');
        setTimeout(() => location.reload(), 1500);
      } else {
        // Limpar URL sem importar
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('Erro ao importar dados:', error);
    }
  }
}

// Inicializar
setTimeout(() => {
  adicionarInterfaceSincronizacao();
  verificarImportacaoURL();
}, 2000);
