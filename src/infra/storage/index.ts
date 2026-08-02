import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface StoragePrivado {
  gravar(entrada: { chave: string; corpo: Uint8Array; contentType: string }): Promise<void>;
  existe(chave: string): Promise<boolean>;
  ler(chave: string): Promise<{ corpo: Uint8Array; contentType: string }>;
  urlLeitura(chave: string, expiraEmSegundos?: number): Promise<string>;
  excluir(chave: string): Promise<void>;
}

interface ConfiguracaoR2 {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export function configuracaoR2(env: Record<string, string | undefined> = process.env): ConfiguracaoR2 | null {
  const accountId = env.R2_ACCOUNT_ID?.trim();
  const accessKeyId = env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = env.R2_BUCKET?.trim();
  return accountId && accessKeyId && secretAccessKey && bucket
    ? { accountId, accessKeyId, secretAccessKey, bucket }
    : null;
}

export function criarStorageR2(config = configuracaoR2()): StoragePrivado {
  if (!config) throw new Error("Cloudflare R2 não configurado. Defina R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY e R2_BUCKET.");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  });
  return {
    async gravar({ chave, corpo, contentType }) {
      await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: chave, Body: corpo, ContentType: contentType, CacheControl: "private, no-store" }));
    },
    async existe(chave) {
      try { await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: chave })); return true; }
      catch (erro) { if ((erro as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false; throw erro; }
    },
    async ler(chave) {
      const resposta = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: chave }));
      if (!resposta.Body) throw new Error("Objeto sem conteúdo no storage privado.");
      return { corpo: await resposta.Body.transformToByteArray(), contentType: resposta.ContentType ?? "application/octet-stream" };
    },
    urlLeitura(chave, expiraEmSegundos = 300) {
      return getSignedUrl(client, new GetObjectCommand({ Bucket: config.bucket, Key: chave, ResponseCacheControl: "private, no-store" }), { expiresIn: Math.min(900, Math.max(30, expiraEmSegundos)) });
    },
    async excluir(chave) { await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: chave })); },
  };
}
