import { useState, useEffect } from 'react';
import { Vault, Wallet, Plus, ShoppingCart, RefreshCw, AlertCircle, CheckCircle, Image, RefreshCcw } from 'lucide-react';

const NFTMarketplaceApp = () => {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para interações com NFT
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [contentURI, setContentURI] = useState(''); // Novo estado para conteúdo
  const [buyTokenId, setBuyTokenId] = useState('');
  const [MyNFTs, setMyNfts] = useState(null);
  const [NFTsForSale, setNFTsForSale] = useState(null);

  // ⚠️ SUBSTITUA PELO SEU ENDEREÇO DE CONTRATO DEPLOYADO NA SEPOLIA
  const CONTRACT_ADDRESS = "0x7eb82857593ff1fE080a9a519585a5Eb5E6EFfC3"; // COLE SEU ENDEREÇO AQUI
  
  // ABI do seu contrato NFT Marketplace
  const CONTRACT_ABI = [
    "function createNFT(string name, uint256 price, string memory contentURI) public",
    "function toggleNFTForSale(uint256 tokenId) public",
    "function buyNFT(uint256 tokenId) public payable",
    "function getNFTData(uint256 tokenId) public view returns (uint256 tokenId, string name, uint256 price)",
    "function getMyNFTs() public view returns (tuple(uint256 tokenId, string name, address owner, uint256 price, bool isForSale, string contentURI)[])",
    "function getNFTsForSale() public view returns(tuple(uint256 tokenId, string name, uint256 price)[])"
  ];

// Conectar carteira
const connectWallet = async () => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });
        setAccount(accounts[0]);
        await getBalance(accounts[0]);
        getMyNFTs();
        getNFTsForSale();
        setSuccess('Carteira conectada com sucesso!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('MetaMask não encontrado. Instale a extensão MetaMask.');
      }
    } catch (err) {
      setError('Erro ao conectar carteira: ' + err.message);
    }
  };

  // desconectar carteira
  const disconnectWallet = async () => {
  setAccount("");
  }

  // Obter saldo da carteira
  const getBalance = async (address) => {
    try {
      if (typeof window.ethereum !== 'undefined') {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        });
        const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
        setBalance(ethBalance.toFixed(4));
      }
    } catch (err) {
      console.error('Erro ao obter saldo:', err);
    }
};

// Função para executar transações
const executeTransaction = async (method, params = [], value = '0') => {
  try {
      setLoading(true);
      setError('');
      setTxHash('');
      if (!window.ethereum) {
        throw new Error('MetaMask não encontrado');
      }
      if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x...") {
        throw new Error('Configure o endereço do contrato primeiro!');
      }
      // Importar ethers dinamicamente
      const { ethers } = await import('https://cdn.skypack.dev/ethers@5.7.2');
      // Criar provider e signer
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      // Verificar se está na rede Sepolia
      const network = await provider.getNetwork();
      if (network.chainId !== 11155111) {
        throw new Error('Por favor, conecte-se à rede Sepolia (Chain ID: 11155111)');
      }
      // Criar instância do contrato
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      // Executar a transação
      let tx;
      if (value && value !== '0') {
        tx = await contract[method](...params, { 
          value: ethers.utils.parseEther(value.toString())
        });
      } else {
        tx = await contract[method](...params);
      }
      setTxHash(tx.hash);
      setSuccess(`Transação ${method} enviada! Aguardando confirmação...`);
      // Aguardar confirmação
      const receipt = await tx.wait();
      setSuccess(`Transação ${method} confirmada! Block: ${receipt.blockNumber}`);
      return receipt;
  } 
  catch (err) {
      console.error('Erro na transação:', err);
      if (err.message.includes('user rejected')) {
        setError('Transação cancelada pelo usuário');
      } else if (err.message.includes('insufficient funds')) {
        setError('Saldo insuficiente para executar a transação');
      } else if (err.message.includes('Chain ID')) {
        setError('Por favor, conecte-se à rede Sepolia no MetaMask');
      } else if (err.message.includes('Configure o endereço')) {
        setError('Configure o endereço do contrato no código!');
      } else {
        setError('Erro na transação: ' + (err.reason || err.message));
      }
      throw err;
  } 
  finally {
      setLoading(false);
  }
};

// Criar NFT
const createNFT = async () => {
    if (!name || !price || !contentURI) {
      setError('Preencha o ID do token, preço e conteúdo/link');
      return;
    }
    try {
      // Converter preço para wei
      const { ethers } = await import('https://cdn.skypack.dev/ethers@5.7.2');
      const priceInWei = ethers.utils.parseEther(price.toString());
      
      await executeTransaction('createNFT', [name, priceInWei, contentURI]);
      setName('');
      setPrice('');
      setContentURI('');
    } 
    catch (err) {
      console.error('Erro ao criar NFT:', err);
    }
  };

// Colocar NFT à venda
const toggleForSale = async (tokenId) => {
    try {
      await executeTransaction('toggleNFTForSale', [parseInt(tokenId)]);
      getNFTsForSale()
    } 
    catch (err) {
      console.error('Erro ao definir status de venda:', err);
    }
  };

// Puxando meus tokens
const getMyNFTs = async() => {
  try {
    setLoading(true);
    setError('');
    if (!window.ethereum) {
      throw new Error('MetaMask não encontrado');
    }
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x...") {
      throw new Error('Configure o endereço do contrato primeiro!');
    }
    // Importar ethers e criar provider
    const { ethers } = await import('https://cdn.skypack.dev/ethers@5.7.2');
    // Criar provider e signer
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    // Verificar se está na rede Sepolia
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111) {
      throw new Error('Por favor, conecte-se à rede Sepolia (Chain ID: 11155111)');
    } 
    // Criar instância do contrato
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    // Chamar a função getMyNFTs do contrato
    const result = await contract.getMyNFTs();
    // Converter os dados para um formato mais legível
    const formattedNFTs = result.map(nft => ({
      tokenId: nft.tokenId.toString(),
      name: nft.name,
      owner: nft.owner.toString(),
      price: ethers.utils.formatEther(nft.price),
      isForSale: nft.isForSale,
      contentURI: nft.contentURI
    }));
    setMyNfts(formattedNFTs);
    setSuccess(`Encontrados ${formattedNFTs.length} NFTs!`);
    return formattedNFTs;
  } 
  catch (err) {
    console.error('Erro ao buscar NFTs:', err);
    setError('Erro ao buscar NFTs: ' + (err.reason || err.message));
    return [];
  } 
  finally {
    setLoading(false);
  }
};

// Comprar NFT
const buyNFT = async () => {
  if (!buyTokenId) {
    setError('Digite o ID do token para comprar');
    return;
  }
  try {
    // Primeiro buscar o preço do NFT
    const nft = await getNFTData(buyTokenId);
    const { ethers } = await import('https://cdn.skypack.dev/ethers@5.7.2');
    const priceInEth = ethers.utils.formatEther(nft.price);
    await executeTransaction('buyNFT', [parseInt(buyTokenId)], priceInEth);
    setBuyTokenId('');
    await getBalance(account);
  } 
  catch (err) {
    console.error('Erro ao comprar NFT:', err);
  }
};

// Buscar dados do NFT
const getNFTData = async (id) => {
   try {
    setLoading(true);
    
    if (!window.ethereum) {
      throw new Error('MetaMask não encontrado');
    }
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x...") {
      throw new Error('Configure o endereço do contrato primeiro!');
    }
    // Importar ethers e criar provider
    const { ethers } = await import('https://cdn.skypack.dev/ethers@5.7.2');
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // Chamar a função getNFT do contrato
    const result = await contract.getNFTData(parseInt(id));
    console.log(result)
    return {
      tokenId: result[0].toString(),
      name: result[1],
      price: result[2].toString(),
    };
  } 
  catch (err) {
    console.error('Erro ao buscar NFT:', err);
    setError('Erro ao buscar NFT: ' + (err.reason || err.message));
    return null;
  } 
  finally {
    setLoading(false);
  }
};

// Puxando dados do token
const getNFTsForSale = async () => {
  try {
    setLoading(true);
    
    if (!window.ethereum) {
      throw new Error('MetaMask não encontrado');
    }
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "0x...") {
      throw new Error('Configure o endereço do contrato primeiro!');
    }
    // Importar ethers e criar provider
    const { ethers } = await import('https://cdn.skypack.dev/ethers@5.7.2');
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    
    // Chamar a função getNFT do contrato
    const result = await contract.getNFTsForSale();
    const formattedNFTs = result.map(nft => ({
      tokenId: nft.tokenId.toString(),
      name: nft.name,
      price: ethers.utils.formatEther(nft.price),
    }));
    setNFTsForSale(formattedNFTs);
    return;
  } 
  catch (err) {
    console.error('Erro ao buscar NFT:', err);
    setError('Erro ao buscar NFT: ' + (err.reason || err.message));
    return null;
  } 
  finally {
    setLoading(false);
  }
};

useEffect(() => {
  // Verificar se já há uma carteira conectada
  if (typeof window.ethereum !== 'undefined') {
    setLoading(true);
    window.ethereum.request({ method: 'eth_accounts' })
      .then(accounts => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
          getBalance(accounts[0]);
          getMyNFTs();
          getNFTsForSale();
        }
      });
    setLoading(false);
  }
}, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <Image className="text-purple-400" size={48} />
            NFT Marketplace
          </h1>
          <p className="text-purple-200 text-lg">Crie, venda e compre NFTs na Sepolia Testnet</p>
        </div>

        {/* Status Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg flex items-center gap-2 text-red-200">
            <AlertCircle size={20} />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-300 hover:text-red-100">×</button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-500/20 border border-green-500 rounded-lg flex items-center gap-2 text-green-200">
            <CheckCircle size={20} />
            <span>{success}</span>
            <button onClick={() => setSuccess('')} className="ml-auto text-green-300 hover:text-green-100">×</button>
          </div>
        )}

        {/* Wallet Connection */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Wallet size={24} />
            Minha carteira
          </h2>
          
          {!account ? (
            <button
              onClick={connectWallet}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
            >
              Conectar MetaMask
            </button>
          ) : (
            <div className="space-y-3">
              <div className="text-white bg-black/20 p-3 rounded-lg">
                <span className="text-purple-200">Endereço: </span>
                <span className="font-mono">{account.slice(0, 10)}...{account.slice(-10)}</span>
              </div>
              <div className="text-white bg-black/20 p-3 rounded-lg">
                <span className="text-purple-200">Saldo: </span>
                <span className="font-bold">{balance} SepoliaETH</span>
                <span className="text-xs text-purple-300 ml-2">(Testnet)</span>
              </div>
              <button
                  onClick={disconnectWallet}
                  className="w-2/3 mx-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg flex items-center justify-center"
                >
                  Desconectar carteira
                </button>
            </div>
          )}
        </div>

        {/* Main Functions */}
        {account && (
          <div className="grid lg:grid-cols-2 gap-8">
          
          {/* My NFTs*/}
          {MyNFTs ? (
          <div className="col-span-full bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 ">
            <div className="flex justify-between">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Vault size={24} className="text-blue-400" />
                Seus Tokens
              </h3>
              <button
                onClick={getMyNFTs}
              >
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                {loading ? <RefreshCw className="animate-spin text-blue-400" size={24} /> : <RefreshCcw size={24} className="text-blue-400" />}
                
              </h3>
              </button>
            </div>

              
            <div className="space-y-4">
              <table className="table-auto text-white text-left w-full">
                <thead>
                  <tr>
                    <th className='mr-5'>Nome</th>
                    <th>Id do token</th>
                    <th>Preço</th>
                    <th>Conteúdo</th>
                    <th>A venda</th>
                  </tr>
                </thead>
                <tbody>
                  {MyNFTs.map((nft) =>
                  <tr>
                    <td>{nft.name}</td>
                    <td>{nft.tokenId}</td>
                    <td>{nft.price}</td>
                    <td>{nft.contentURI}</td>
                    {(!loading) ? (
                      (nft.isForSale) ? (
                      <td>
                        <button
                        onClick={() => toggleForSale(nft.tokenId)}
                        className="flex-1 text-white font-medium py-2 rounded-lg transition-all"
                        >
                          🟢
                        </button>
                      </td>
                      ) : (
                      <td>
                        <button
                        onClick={() => toggleForSale(nft.tokenId)}
                        className="flex-1 text-white font-medium py-2 rounded-lg transition-all"
                        >
                          🔴
                        </button>
                      </td>
                      )
                    ) : (
                    <td>
                        <button
                        onClick={() => toggleForSale(nft.tokenId)}
                        className="flex-1 text-white font-medium py-2 rounded-lg transition-all"
                        >
                          🔘
                        </button>
                      </td>
                    )}
                  </tr>
                  )}
                </tbody>
              </table>
              </div>
              
          </div>
          ) : (
            <div className="col-span-full bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 ">
            <div className="flex justify-between">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Vault size={24} className="text-blue-400" />
                Seus Tokens
              </h3>
              <button
                  onClick={getMyNFTs}
                  disabled={loading}
                  className="text-white font-semibold px-3 py-3 rounded-lg bg-blue-600 hover:bg-blue-700"
                >
                  Mostrar seus Tokens
                </button>
            </div>
            </div>
          )}

            {/* Create NFT */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Plus size={24} className="text-green-400" />
                Criar NFT
              </h3>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Nome do Token"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/30 text-white p-3 rounded-lg border border-gray-500 focus:border-purple-400 focus:outline-none"
                />
                <input
                  type="number"
                  step="0.001"
                  placeholder="Preço em ETH (ex: 0.1)"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-black/30 text-white p-3 rounded-lg border border-gray-500 focus:border-purple-400 focus:outline-none"
                />
                <textarea
                  placeholder="Conteudo do Token"
                  value={contentURI}
                  onChange={(e) => setContentURI(e.target.value)}
                  rows={3}
                  className="w-full bg-black/30 text-white p-3 rounded-lg border border-gray-500 focus:border-purple-400 focus:outline-none resize-none"
                />
                <button
                  onClick={createNFT}
                  disabled={loading}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
                  Criar NFT com Conteúdo
                </button>
              </div>
            </div>

            {/* Buy NFT */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <ShoppingCart size={24} className="text-blue-400" />
                Comprar NFT
              </h3>
              
              <div className="space-y-4">
                <input
                  type="number"
                  placeholder="ID do Token para comprar"
                  value={buyTokenId}
                  onChange={(e) => setBuyTokenId(e.target.value)}
                  className="w-full bg-black/30 text-white p-3 rounded-lg border border-gray-500 focus:border-blue-400 focus:outline-none"
                />
                
                <button
                  onClick={buyNFT}
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={16} /> : <ShoppingCart size={16} />}
                  Comprar NFT
                </button>
              </div>
            </div>

            {/* Lista de Tokens */}
            {NFTsForSale ? (
              <div className="col-span-full bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 ">
                <div className="flex justify-between">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <ShoppingCart size={24} className="text-blue-400" />
                    Tokens a venda
                  </h3>
                  <button
                    onClick={getNFTsForSale}
                  >
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    {loading ? <RefreshCw className="animate-spin text-blue-400" size={24} /> : <RefreshCcw size={24} className="text-blue-400" />}
                  </h3>
                  </button>
                </div>
                <div className="space-y-4">
                  <table className="table-auto text-white text-left w-full">
                    <thead>
                      <tr>
                        <th className='mr-5'>Nome</th>
                        <th>Id do token</th>
                        <th>Preço</th>
                        <th>A venda</th>
                      </tr>
                    </thead>
                    <tbody>
                          {NFTsForSale.map((nft) =>
                          <tr>
                            <td>{nft.name}</td>
                            <td>{nft.tokenId}</td>
                            <td>{nft.price}</td>
                            {(!loading) ? (
                              <td>
                                <h3 className="flex-1 text-white font-medium py-2 rounded-lg transition-all">
                                  🟢
                                </h3>
                              </td>
                            ) : (
                              <td>
                                <h3 className="flex-1 text-white font-medium py-2 rounded-lg transition-all">
                                  🔘
                                </h3>
                              </td>
                            )}
                          </tr>
                          )}
                        </tbody>
                      </table>
                      </div>
                      
                  </div>
            ) : (
              <div className="col-span-full bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20 ">
                <div className="flex justify-between">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <ShoppingCart size={24} className="text-blue-400" />
                    Tokens a venda
                  </h3>
                  <button
                      onClick={getNFTsForSale}
                      disabled={loading}
                      className="text-white font-semibold px-3 py-3 rounded-lg bg-blue-600 hover:bg-blue-700"
                    >
                      Mostrar Tokens a venda
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NFTMarketplaceApp;