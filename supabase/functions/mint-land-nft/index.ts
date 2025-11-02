import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { coordinates, runId, userId, area } = await req.json();
    
    if (!coordinates || !runId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PINATA_JWT = Deno.env.get('PINATA_JWT');
    if (!PINATA_JWT) {
      console.error('PINATA_JWT not configured');
      return new Response(
        JSON.stringify({ error: 'PINATA_JWT not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Close the polygon by adding first coordinate to the end
    const closedPolygon = [...coordinates];
    if (coordinates.length > 0) {
      closedPolygon.push(coordinates[0]);
    }

    // Get address using Google Geocoding API (reverse geocoding)
    const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');
    let address = 'Unknown Location';
    
    if (GOOGLE_MAPS_API_KEY && coordinates.length > 0) {
      try {
        const centerLat = coordinates.reduce((sum: number, coord: any) => sum + coord.lat, 0) / coordinates.length;
        const centerLng = coordinates.reduce((sum: number, coord: any) => sum + coord.lng, 0) / coordinates.length;
        
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${centerLat},${centerLng}&key=${GOOGLE_MAPS_API_KEY}`
        );
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.results && geocodeData.results[0]) {
          address = geocodeData.results[0].formatted_address;
        }
      } catch (error) {
        console.error('Geocoding error:', error);
      }
    }

    // Create NFT metadata
    const metadata = {
      name: `Territory-${new Date().getTime()}`,
      description: `Claimed territory from run on ${new Date().toISOString()}`,
      image: `https://maps.googleapis.com/maps/api/staticmap?size=600x400&path=color:0x0000ff80|weight:2|fillcolor:0x0000ff40|${closedPolygon.map((c: any) => `${c.lat},${c.lng}`).join('|')}&key=${GOOGLE_MAPS_API_KEY || ''}`,
      attributes: {
        coordinates: closedPolygon,
        area_km2: area,
        address: address,
        claimed_at: new Date().toISOString(),
      }
    };

    console.log('Uploading metadata to Pinata...');
    
    // Upload to Pinata IPFS
    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: metadata.name,
        },
      }),
    });

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text();
      console.error('Pinata error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to upload to Pinata', details: errorText }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pinataData = await pinataResponse.json();
    const ipfsCid = pinataData.IpfsHash;
    const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${ipfsCid}`;

    console.log('Metadata uploaded to IPFS:', ipfsUrl);

    // Save to database
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: nftData, error: nftError } = await supabase
      .from('land_nfts')
      .insert({
        user_id: userId,
        run_id: runId,
        name: metadata.name,
        polygon_coordinates: closedPolygon,
        area_size: area,
        mint_transaction_hash: ipfsCid, // Store CID as transaction hash for now
        status: 'pending', // Set initial status as pending
      })
      .select()
      .single();

    if (nftError) {
      console.error('Database error:', nftError);
      return new Response(
        JSON.stringify({ error: 'Failed to save NFT to database', details: nftError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        ipfsCid,
        ipfsUrl,
        metadata,
        nft: nftData,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in mint-land-nft:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
