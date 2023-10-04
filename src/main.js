const express = require('express');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const app = express();
app.use(express.json());

const port = 3000;

app.post('/pessoas', async (req, res) => {
  const { apelido, nome, nascimento, stack } = req.body;

  if (!nome) {
    return res.status(422).json({ error: 'O nome é Obrigatório' });
  }

  if (!apelido) {
    return res.status(422).json({ error: 'O apelido é Obrigatório' });
  }

  if (!nascimento) {
    return res.status(422).json({ error: 'O nascimento é Obrigatório' });
  }

  const apelidoDuplicado = await prisma.user.count({
    where: {
      apelido,
    },
  });

  if (apelidoDuplicado) {
    return res.status(422).json({ error: 'O apelido deve ser único' });
  }

  if (typeof nome !== 'string') {
    return res.status(400).json({ error: 'O nome deve ser string' });
  }

  let nascimentoDate = new Date(nascimento);

  try {
    if (stack && stack.length > 0) {
      const pessoa = await prisma.user.create({
        data: {
          apelido,
          nome,
          nascimento: nascimentoDate,
          stack: {
            create: stack.map((item) => ({ stack: item })),
          },
        },
      });
      pessoa.stack = stack;
      return res.status(200).json(pessoa);
    } else {
      const pessoa = await prisma.user.create({
        data: {
          apelido,
          nome,
          nascimento: nascimentoDate,
        },
      });
      return res.status(200).json(pessoa);
    }
  } catch (err) {
    res.send(err);
  }
});

app.get('/pessoas/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const pessoa = await prisma.user.findFirst({
      where: { id },
      include: { stack: { select: { stack: true } } },
    });

    if (!pessoa) {
      return res.status(404).json({ error: 'Pessoa não existe' });
    }

    if (pessoa.stack && pessoa.stack.length > 0) {
      const stack = pessoa.stack.map((data) => data.stack);

      const response = {
        ...pessoa,
        stack: stack,
      };
      return res.status(200).json(response);
    } else {
      return res.status(200).json(pessoa);
    }
  } catch (err) {
    res.send(err);
  }
});

app.get('/pessoas', async (req, res) => {
  const { t } = req.query;

  if (!t) {
    return res.send('O termo de busca é obrigatório');
  }

  try {
    const pessoas = await prisma.user.findMany({
      where: {
        OR: [
          {
            apelido: {
              contains: t,
            },
          },
          {
            nome: {
              contains: t,
            },
          },
          {
            stack: {
              some: {
                stack: {
                  contains: t,
                },
              },
            },
          },
        ],
      },
      include: { stack: { select: { stack: true } } },
    });

    const response = pessoas.map((pessoa) => ({
      id: pessoa.id,
      apelido: pessoa.apelido,
      nome: pessoa.nome,
      nascimento: pessoa.nascimento,
      stack: pessoa?.stack?.map((item) => item.stack),
    }));

    res.status(200).json(response);
  } catch (err) {
    return res.send(err);
  }
});

app.get('/contagem-pessoas', async (req, res) => {
  try {
    const count = await prisma.user.count();
    return res.send(count.toString());
  } catch (err) {
    return res.send(err);
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
