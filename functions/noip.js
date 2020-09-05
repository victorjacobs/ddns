import fetch from 'node-fetch'
import { parseDomain } from 'parse-domain'
import 'encoding'

exports.handler = async (event, context) => {
  try {
    const hostname = event.queryStringParameters.hostname
    const ip = event.queryStringParameters.myip

    const [user, password] = Buffer.from(
      event.headers.authorization.split(' ')[1],
      'base64'
    )
      .toString()
      .split(':')

    const { subDomains, domain, topLevelDomains } = parseDomain(hostname).icann

    const zone = `${domain}.${topLevelDomains.join('.')}`

    console.log(`Updating ${hostname} to ${ip}...`)

    const recordId = await fetch(
      `https://api.dnsimple.com/v2/${user}/zones/${zone}/records?name=${subDomains[0]}&type=A`,
      {
        headers: {
          Authorization: `Bearer ${password}`,
          'Content-Type': 'application/json'
        }
      }
    )
      .then((response) => {
        return response.json()
      })
      .then((parsed) => {
        if (parsed.data.length === 0) {
          return undefined
        }

        return parsed.data[0].id
      })

    if (recordId !== undefined) {
      console.log(`Updating record for ${hostname}...`)
      await fetch(
        `https://api.dnsimple.com/v2/${user}/zones/${zone}/records/${recordId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            content: ip
          }),
          headers: {
            Authorization: `Bearer ${password}`,
            'Content-Type': 'application/json'
          }
        }
      )
    } else {
      console.log(`Creating new record for ${hostname}...`)
      await fetch(`https://api.dnsimple.com/v2/${user}/zones/${zone}/records`, {
        method: 'POST',
        body: JSON.stringify({
          name: subDomains[0],
          type: 'A',
          content: ip
        }),
        headers: {
          Authorization: `Bearer ${password}`,
          'Content-Type': 'application/json'
        }
      })
    }

    return {
      statusCode: 204,
      body: ''
    }
  } catch (err) {
    return { statusCode: 500, body: err.toString() }
  }
}
