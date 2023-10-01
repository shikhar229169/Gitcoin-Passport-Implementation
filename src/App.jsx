import { useState, useEffect } from "react";
import { ethers } from "ethers";

const API_KEY = import.meta.env.VITE_REACT_APP_GC_API_KEY
const SCORER_ID = import.meta.env.VITE_REACT_APP_GC_SCORER_ID

// endpoint for submitting passport
const SUBMIT_PASSPORT_URI = 'https://api.scorer.gitcoin.co/registry/submit-passport'
// endpoint for getting the signing message
const SIGNING_MESSAGE_URI = 'https://api.scorer.gitcoin.co/registry/signing-message'

// Minimum score to access something
const THRESHOLD_SCORE = 3

const headers = API_KEY ? (
  {
    'Content-Type': 'application/json',
    'X-API-KEY': API_KEY
  }
) : undefined

function App() {
  const [address, useAddress] = useState('')
  const [connected, setConnected] = useState(false)
  const [score, setScore] = useState('')
  const [message, setMessage] = useState('')
  const [issuer, setIssuer] = useState([])

  useEffect(() => {
    checkConnection()
    async function checkConnection() {
      try {
        if (window.ethereum.selectedAddress) {
          useAddress(window.ethereum.selectedAddress)
          setConnected(true)
          getScore(window.ethereum.selectedAddress)
        }        
      }
      catch(err) {
        console.log(err);        
      }
    }
  }, [])

  async function connect() {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' })
      useAddress(window.ethereum.selectedAddress)
      setConnected(true)
      setMessage('Connected To Metamask Successfully!')
    }
    catch(err) {
      console.log('error in connecting to metamask', err);
    }
  }

 async function _getSigningMessage() {
  try {
    const response = await fetch(SIGNING_MESSAGE_URI, { headers })
    const signingData = await response.json()
    return signingData
  }
  catch(err) {
    console.log('Error getting signing message: ', err);
  }
 }

  async function submitPassport() {
    try {
      const { message, nonce } = await _getSigningMessage()
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner(window.ethereum.selectedAddress)
      const signature = await signer.signMessage(message)
      const response = await fetch(SUBMIT_PASSPORT_URI, { 
        method: 'POST',
        headers,
        body: JSON.stringify({
          address,
          scorer_id: SCORER_ID,
          signature,
          nonce
        })
      })

      const data = await response.json()
      console.log('data:', data);
      setMessage('Passport Submitted!')
    }
    catch(err) {
      console.log('Error in submitting passport: ', err);
      setMessage('Error in submitting passport')
    }
  }

  async function getScore() {
    const GET_PASSPORT_SCORE_URI = `https://api.scorer.gitcoin.co/registry/score/${SCORER_ID}/${window.ethereum.selectedAddress}`
    try {
      const response = await fetch(GET_PASSPORT_SCORE_URI, { headers })
      const passportData = await response.json()
      console.log(passportData);
      if (passportData.score) {
        const roundedScore = Math.round(passportData.score * 100) / 100
        setScore(roundedScore)
        
        if (roundedScore > THRESHOLD_SCORE) {
          setMessage(`Your Score is ${roundedScore}. Voilla You are qualified to register in out protocol.`)
        }
        else {
          setMessage(`Your Score is ${roundedScore}. You are not qualified`)
        }
      }
      else {
        console.log('No score available, please add stamps and also make sure you submit it first.');
      }
    }
    catch (err) {
      console.log('Error: ', err);
    }
  }

  async function getPassportStamps() {
    const GET_PASSPORT_STAMPS_URI = `https://api.scorer.gitcoin.co/registry/stamps/${window.ethereum.selectedAddress}`
    try {
      const response = await fetch(GET_PASSPORT_STAMPS_URI, { headers })
      const data = await response.json()
      const currIssuers = []
      console.log('Data:', data)

      for (const i in data.items) {
        currIssuers.push({
          id: i,
          provider: data.items[i].credential.credentialSubject.provider
        });
      }      
      setIssuer(currIssuers)
    } catch (err) {
      console.log('error: ', err)
    }
  }

  return (
    <div>
      <div>
        {
          !connected && (
            <button onClick={connect}>Connect To Metamask</button>
          )
        }
        {
          connected && (
            <div>Connected Address: {address}</div>
          )
        }
      </div>
      <div>
        <p>Welcome To Our Protocol</p>
        <p>First You need to visit the <a href="https://passport.gitcoin.co/#/dashboard" target="_blank">Gitcoin Passport</a> website to submit your stamps</p>
        <p>Once you submit your desired stamps aka authorize with your accounts, you are then required to submit your passport to our protocol for further score verification</p>
        <p>Minimum required score is {THRESHOLD_SCORE}</p>
        <p>Note: If you authorize your account on the Gitcoin Passport, then you again have to submit your passport here</p>
        <button onClick={submitPassport}>Submit Passport</button>
        <button onClick={getScore}>Get Score</button>
        <button onClick={getPassportStamps}>Get Passport Stamps</button>
      </div>
      <br />
      <div>
        Message: {message}
      </div>
      <br />
      <div>
        You have credentials from the following providers:
        <ul>
          {
            issuer.map((item) => {
              return (
                <li key={item.id}>{item.provider}</li>
              )
            })
          }
        </ul>
      </div>
    </div>
  )
}

export default App