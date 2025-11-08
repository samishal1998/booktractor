import { toNodeHandler } from 'better-auth/node';
import { auth } from '@booktractor/db/auth';
import type { NextApiRequest, NextApiResponse } from 'next';

// Disable body parsing to allow BetterAuth to handle it
export const config = {
  api: {
    bodyParser: false,
  },
};

const handler = toNodeHandler(auth.handler);

export default async function authHandler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return handler(req, res);
}
