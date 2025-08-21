import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Grant minter role function called');

    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const contractAddress = Deno.env.get('IMMUTABLE_CONTRACT_ADDRESS');
    const mintingContractAddress = Deno.env.get('IMMUTABLE_MINTING_CONTRACT_ADDRESS');
    const ownerPrivateKey = Deno.env.get('IMMUTABLE_OWNER_PRIVATE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    if (!contractAddress || !mintingContractAddress || !ownerPrivateKey) {
      throw new Error('Missing Immutable configuration. Please ensure IMMUTABLE_CONTRACT_ADDRESS, IMMUTABLE_MINTING_CONTRACT_ADDRESS, and IMMUTABLE_OWNER_PRIVATE_KEY are set.');
    }

    console.log('Configuration loaded:', {
      contractAddress,
      mintingContractAddress: mintingContractAddress.substring(0, 10) + '...',
      hasOwnerKey: !!ownerPrivateKey
    });

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Import required modules for Immutable SDK
    const { ethers } = await import('https://esm.sh/ethers@5.7.2');
    const { ERC721Client } = await import('https://esm.sh/@imtbl/contracts');

    // Set up provider for Immutable zkEVM testnet
    const provider = new ethers.providers.JsonRpcProvider('https://rpc.testnet.immutable.com');
    
    // Create wallet from private key
    const wallet = new ethers.Wallet(ownerPrivateKey, provider);
    
    console.log('Wallet address:', wallet.address);

    // Create contract client
    const contract = new ERC721Client(contractAddress);

    console.log('Granting minter role to minting contract...', {
      contract: contractAddress,
      minter: mintingContractAddress,
      from: wallet.address
    });

    // Grant minter role to the Immutable minting contract
    const populatedTransaction = await contract.populateGrantMinterRole(
      mintingContractAddress,
      {
        maxPriorityFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
        maxFeePerGas: ethers.utils.parseUnits('150', 'gwei'),
        gasLimit: 200000
      }
    );

    console.log('Populated transaction:', {
      to: populatedTransaction.to,
      data: populatedTransaction.data?.substring(0, 50) + '...',
      gasLimit: populatedTransaction.gasLimit?.toString(),
      maxFeePerGas: populatedTransaction.maxFeePerGas?.toString()
    });

    // Send the transaction
    const txResponse = await wallet.sendTransaction(populatedTransaction);
    console.log('Transaction sent:', {
      hash: txResponse.hash,
      from: txResponse.from,
      to: txResponse.to
    });

    // Wait for transaction confirmation
    const receipt = await txResponse.wait();
    console.log('Transaction confirmed:', {
      hash: receipt.transactionHash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString(),
      status: receipt.status
    });

    if (receipt.status === 0) {
      throw new Error('Transaction failed');
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed?.toString(),
        message: 'Minter role granted successfully to Immutable minting contract'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in grant-minter-role function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});