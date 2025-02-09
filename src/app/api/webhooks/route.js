import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { createOrUpdateUser } from '@/lib/actions/user'

export default async function handler(req, res) {
  const SIGNING_SECRET = process.env.SIGNING_SECRET

  if (!SIGNING_SECRET) {
    throw new Error('Error: Please add SIGNING_SECRET from Clerk Dashboard to .env or .env.local')
  }

  // Create new Svix instance with secret
  const wh = new Webhook(SIGNING_SECRET)

  // Get headers
  const { headers, body } = req;
  const svix_id = headers['svix-id'];
  const svix_timestamp = headers['svix-timestamp'];
  const svix_signature = headers['svix-signature'];

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing Svix headers', {
      status: 400,
    });
  }

  // Verify payload with headers
  let evt;
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) 
  } catch (err) {
    console.error('Error: Could not verify webhook:', err)
    return new Response('Error: Verification error', {
      status: 400,
    })
  }

  // Do something with payload
  // For this guide, log payload to console
  const eventType = evt?.type;
  console.log(`Received webhook with ID ${svix_id} and event type of ${eventType}`);
  console.log('Webhook payload:', body);

  if (eventType === 'user.created' || eventType === 'user.updated') {
    const { id, first_name, last_name, image_url, email_addresses, username } = evt?.data;
    try {
      await createOrUpdateUser(id, first_name, last_name, image_url, email_addresses, username);
      return new Response('User created or updated', { status: 200 });
    } catch (error) {
      console.log('error creating or updating user:', error);
      return new Response('Error: Could not create or update user', {
        status: 400,
      });
    }
  }

  if (eventType === 'user.deleted') {
    const { id } = evt?.data;
    try {
      await deleteUser(id);
      return new Response('User deleted', { status: 200 });
    } catch (error) {
      console.log('error deleting user:', error);
      return new Response('Error: Could not delete user', {
        status: 400,
      });
    }
  }

  return new Response('Webhook received', { status: 200 });
}