import { graphql, buildSchema } from 'graphql'

export interface Env {
  OPENAI_API_KEY: string
}

const schema = buildSchema(`
  input MessageInput {
    role: String!
    content: String!
  }

  type Query {
    chat(model: String!, messages: [MessageInput!]!): String
  }
`)
const rootValue = (env: Env) => ({
  chat: async ({ model, messages }: any) => {
    try {
      console.log('🔑 OPENAI_API_KEY:', env.OPENAI_API_KEY ? '[已设置]' : '[未设置]');
      console.log('📥 请求参数:', JSON.stringify({ model, messages }));

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      });

      const text = await res.text();
      console.log('📤 OpenAI response:', text);

      if (!res.ok) {
        return `❌ OpenAI API 请求失败: ${res.status} - ${text}`;
      }

      const json = JSON.parse(text);
      return json.choices?.[0]?.message?.content || '⚠️ OpenAI 无返回结果';

    } catch (err: any) {
      console.error('🔥 OpenAI 请求异常:', err);
      return '❗ OpenAI 请求异常，请检查网络或 API Key';
    }
  }
})

export default {
  async fetch(request: Request, env: Env) {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理 CORS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === 'POST') {
      try {
        const { query, variables } = await request.json();
        const result = await graphql({
          schema,
          source: query,
          rootValue: rootValue(env),
          variableValues: variables,
        });

        console.log('📡 GraphQL result:', JSON.stringify(result));

        return new Response(JSON.stringify(result), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          },
        });
      } catch (err: any) {
        console.error('🛑 GraphQL 执行失败:', err);
        return new Response(JSON.stringify({ error: 'GraphQL 执行失败' }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    return new Response('GraphQL endpoint ready', { status: 200 });
  }
}
