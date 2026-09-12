/* ============================================================
   BIG BROTHER ACCOUNTING SYSTEM
   COGS SUPABASE ADAPTER V1
   ============================================================ */

(function(){

'use strict';


const SUPABASE_URL =
  'https://sjfhlaclgmkwwofzstok.supabase.co';


const SUPABASE_KEY =
  'sb_publishable_w762jR65CWwlO30fKQsYOw_6L9grx8S';


const SESSION_KEY =
  'BB_SUPABASE_DEV_SESSION_V1';



let session = null;



/* ============================================================
   SESSION
   ============================================================ */

function readSession(){

  try{

    return JSON.parse(
      localStorage.getItem(
        SESSION_KEY
      )
      ||
      'null'
    );

  }catch(error){

    return null;

  }

}



function saveSession(
  value
){

  session =
    value || null;


  if(
    !value
  ){

    localStorage.removeItem(
      SESSION_KEY
    );

    return;

  }


  if(
    !value.expires_at
    &&
    value.expires_in
  ){

    value.expires_at =

      Math.floor(
        Date.now()/1000
      )

      +

      Number(
        value.expires_in
      );

  }


  localStorage.setItem(

    SESSION_KEY,

    JSON.stringify(
      value
    )

  );

}



/* ============================================================
   RESPONSE
   ============================================================ */

async function parseResponse(
  response
){

  const text =
    await response.text();


  let data = {};


  try{

    data =
      text
        ?
        JSON.parse(
          text
        )
        :
        {};

  }catch(error){

    data = {
      message:text
    };

  }


  if(
    !response.ok
  ){

    throw new Error(

      data.message

      ||

      data.error_description

      ||

      data.error

      ||

      'Supabase request failed'

    );

  }


  return data;

}



/* ============================================================
   REFRESH TOKEN
   ============================================================ */

async function refreshSession(){

  const current =
    readSession();


  if(
    !current?.refresh_token
  ){

    throw new Error(
      'Please sign in to BIG BROTHER first.'
    );

  }


  const response =
    await fetch(

      SUPABASE_URL
      +
      '/auth/v1/token?grant_type=refresh_token',

      {

        method:'POST',

        headers:{

          apikey:
            SUPABASE_KEY,

          'Content-Type':
            'application/json'

        },

        body:
          JSON.stringify(
            {
              refresh_token:
                current.refresh_token
            }
          )

      }

    );


  const next =
    await parseResponse(
      response
    );


  saveSession(
    next
  );


  return next;

}



/* ============================================================
   ENSURE SESSION
   ============================================================ */

async function ensureSession(){

  session =
    readSession();


  if(
    !session?.access_token
  ){

    throw new Error(
      'Please sign in to BIG BROTHER first.'
    );

  }


  const now =
    Math.floor(
      Date.now()/1000
    );


  if(
    session.expires_at

    &&

    Number(
      session.expires_at
    )
    <
    now + 30
  ){

    await refreshSession();

  }


  return session;

}



/* ============================================================
   RPC
   ============================================================ */

async function rpc(
  functionName,
  args={}
){

  await ensureSession();


  const response =
    await fetch(

      SUPABASE_URL
      +
      '/rest/v1/rpc/'
      +
      functionName,

      {

        method:'POST',

        headers:{

          apikey:
            SUPABASE_KEY,

          Authorization:
            'Bearer '
            +
            session.access_token,

          'Content-Type':
            'application/json'

        },

        body:
          JSON.stringify(
            args || {}
          ),

        cache:'no-store'

      }

    );


  return parseResponse(
    response
  );

}



/* ============================================================
   REPORTS
   ============================================================ */

async function dailyReport(
  reportDate
){

  return rpc(

    'bb_cogs_daily_report',

    {
      p_date:
        reportDate
    }

  );

}



async function monthlyReport(
  year,
  month
){

  return rpc(

    'bb_cogs_monthly_report',

    {
      p_year:
        Number(
          year
        ),

      p_month:
        Number(
          month
        )
    }

  );

}



/* ============================================================
   EXPORT
   ============================================================ */

window.BBCogsAdapter = {

  rpc,

  dailyReport,

  monthlyReport,

  readSession,

  refreshSession

};


})();
