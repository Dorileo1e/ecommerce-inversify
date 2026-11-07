# E-commerce SOLID — Projeto 2

Este é o e-commerce do Projeto 1 já refatorado (SRP, OCP e LSP). Ele é o ponto de partida deste trabalho.

## Como rodar

### 1. Preparar o projeto (uma vez só)

```bash
npm install
npm run prisma:migrate
npm run prisma:seed
```

### 2. Escolher o modo de execução

A aplicação tem dois modos, escolhidos pela variável `APP_ENV`. Para configurá-la, copie o arquivo de exemplo:

```bash
cp .env.example .env            # Git Bash, Linux e macOS
Copy-Item .env.example .env     # PowerShell
```

Depois abra o `.env` e deixe `APP_ENV=dev` ou `APP_ENV=test`.

| | `APP_ENV=dev` (padrão) | `APP_ENV=test` |
|---|---|---|
| E-mail | `EtherealMailProvider`: envia pelo Ethereal e devolve um link para ver o e-mail | `ConsoleMailProvider`: imprime o e-mail no terminal do servidor |
| Pedidos | `PrismaOrderRepository`: grava no SQLite | `InMemoryOrderRepository`: guarda num array (some ao reiniciar) |
| Produtos | `PrismaProductRepository` (SQLite) | `PrismaProductRepository` (SQLite) |
| Internet | necessária (Ethereal) | **não** necessária |

* Sem o arquivo `.env`, ou com `APP_ENV` vazio, vale o modo `dev`.
* Qualquer valor diferente de `dev` e `test` faz a aplicação parar com a mensagem `APP_ENV inválido`.
* O `.env` não vai para o Git (está no `.gitignore`); o `.env.example` vai.
* O modo `test` não usa internet, mas continua lendo os produtos do SQLite, então rode o `prisma:migrate` e o `prisma:seed` uma vez.

### 3. Subir a API

```bash
npm run dev
```

A API sobe em `http://localhost:3000`. O log mostra qual modo foi montado: `Container montado no modo "test"`.

Para trocar de modo, mude **só** o `APP_ENV` no `.env`, pare o servidor (Ctrl + C) e rode `npm run dev` de novo.

### 4. Testar os dois produtos

No Windows, rode os `curl` abaixo no **Git Bash** (no PowerShell o `curl` é outro comando).

Livro físico (produto 1): R$ 100 + R$ 10 de frete = **R$ 110**.

```bash
curl -X POST http://localhost:3000/orders \
-H "Content-Type: application/json" \
-d '{
  "customer": "cliente@ethereal.email",
  "items": [{ "productId": 1, "quantity": 1 }],
  "paymentMethod": "credit_card",
  "paymentDetails": { "cardNumber": "1234567812345678", "cvv": "123" }
}'
```

E-book (produto 2): R$ 50, sem frete = **R$ 50**.

```bash
curl -X POST http://localhost:3000/orders \
-H "Content-Type: application/json" \
-d '{
  "customer": "cliente@ethereal.email",
  "items": [{ "productId": 2, "quantity": 1 }],
  "paymentMethod": "credit_card",
  "paymentDetails": { "cardNumber": "1234567812345678", "cvv": "123" }
}'
```

O `total` é o mesmo nos dois modos. O que muda é o destino do e-mail e do pedido:

* **`dev`:** a resposta traz `emailPreview` (link do Ethereal) e o pedido fica gravado no banco. Para ver, rode `npx prisma studio` e abra a tabela `Order`.
* **`test`:** `emailPreview` vem `null`, o e-mail aparece impresso no terminal do servidor e o pedido fica só em memória.

## Estrutura

```
src/
├── container/     # types.ts (identificadores) e container.ts (monta tudo e escolhe o modo)
├── domain/        # produtos, pedido e erros de negócio
├── repositories/  # IOrderRepository, IProductRepository, versões Prisma e InMemoryOrderRepository
├── providers/     # IMailProvider, EtherealMailProvider e ConsoleMailProvider
├── payments/      # IPaymentMethod, uma classe por forma de pagamento e o registro
├── services/      # OrderService e NotificationService
├── controllers/   # OrderController: só HTTP
└── app.ts         # pede o OrderController ao container e registra a rota
```

Os services recebem tudo pelo construtor (injeção de dependência com InversifyJS). As classes concretas e a escolha do modo aparecem **somente** no `src/container/container.ts`.

---

## Trabalho

Hoje a montagem é feita na mão, com `new`, no `app.ts`. Troque isso por um container de IoC, o **InversifyJS**, e prove que a infraestrutura pode ser trocada sem tocar na regra de negócio.

### 1. Configure o Inversify

```bash
npm install inversify@7 reflect-metadata
```

No `tsconfig.json`, em `compilerOptions`: `"experimentalDecorators": true` e `"emitDecoratorMetadata": true`.
Na primeira linha do `src/server.ts`: `import 'reflect-metadata';`

> Use a versão 7. A 8 não compila com este `tsconfig`.

### 2. Registre as dependências

* Crie `src/container/types.ts` com um `Symbol` para cada dependência (`TYPES.MailProvider`, `TYPES.OrderRepository`...).
* Coloque `@injectable()` em toda classe que entra no container.
* Coloque `@inject(TYPES.X)` em **todo** parâmetro de construtor, inclusive os de classe concreta.

> O projeto roda com `tsx`, que não gera metadados de tipo. Sem o `@inject` em cada parâmetro, a aplicação cai com `Found unexpected missing metadata`.

* As formas de pagamento são registradas todas com o mesmo identificador e chegam ao `PaymentMethodRegistry` por `@multiInject(TYPES.PaymentMethod)`.
* Provider de e-mail e repositórios são singleton (`inSingletonScope()`).

### 3. Crie um segundo modo de execução

Instale o `dotenv`, importe `dotenv/config` no `server.ts` e copie o `.env.example` para `.env`. O container lê o `APP_ENV` e decide o que injetar:

| | `APP_ENV=dev` | `APP_ENV=test` |
|---|---|---|
| E-mail | `EtherealMailProvider` | `ConsoleMailProvider`, que imprime o e-mail no console |
| Pedidos | `PrismaOrderRepository` | `InMemoryOrderRepository`, que guarda os pedidos num array |

As duas classes do modo `test` são suas. Nesse modo, a aplicação tem de funcionar **sem internet**.
### 4. Monte tudo num lugar só

`src/container/container.ts` passa a ser o **único arquivo** que importa classes concretas e faz `new` de repositório, provider, pagamento, service ou controller. O `app.ts` só pede o `OrderController` ao container e registra a rota.

### Critérios de aceite

1. Clonar, instalar, migrar, popular e rodar funcionam sem erro.
2. Os produtos `1` e `2` dão o total certo nos dois modos.
3. Trocar de modo exige mudar só o `APP_ENV`.
4. A escolha do modo acontece só no `container.ts`: nenhum arquivo de `services/` ou `controllers/` lê o `APP_ENV` nem importa Prisma, Nodemailer ou uma implementação de repositório, provider ou pagamento.
5. Uma seção **"Como rodar"** no seu README explica os dois modos.

### Entrega

Pelo git. Informe na caixa de texto do AVA o link do repositório. Ele não pode estar privado: teste antes de entregar.
