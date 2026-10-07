# Documento Word — A Text File Turned into a `.docx`

One script turns a text file of the project (markdown, `.md` or `.txt`) into a Word document with
the same words and the same numbers, in the same order. When the project has a profile
(`_opencrew/_memory/documento-oficial.md`: logo, header, footer, margins and font), the document
comes out on letterhead. Your part is to find out which file, ask about the letterhead when the
project has none, run the script and show its report.

You do NOT write the `.docx` yourself, and you never change the user's text to make it convert:
the script reads the file as it is. The writing rules of a text that becomes a document (title,
sections, page break, signatures) are in `_opencrew/core/best-practices/documento-oficial.md`.

## Step 1: Which file

`/opencrew documento <arquivo>` names the file. With no file (the command alone, or the menu
option "Documento Word"), ask and wait:

```
Qual arquivo de texto (.md ou .txt) você quer em Word? Diga o caminho a partir da pasta do projeto (por exemplo, `Atas/ata-de-marco.md`).
```

- `{arquivo}` is a path inside the project, written from its root. One file per command: for
  several files, run Steps 3 to 5 once for each.
- Never guess the file, and never pick one "that looks like it": with a name that matches more
  than one file, list them and ask.

## Step 2: The letterhead, when the project has none

Check, with the read tool (no command), whether `_opencrew/_memory/documento-oficial.md` exists.
If it does, go to Step 3: nothing is asked. If it does not, ask and wait:

```
Este projeto ainda não tem papel timbrado configurado. Quer configurar agora (logotipo, cabeçalho e rodapé)? (sim / não)
```

- **"Sim"** —
  1. Run, from the project root: `node _opencrew/core/scripts/documento.mjs --criar-perfil`
     Its last line is `PERFIL:CRIADO` (the file was created from the model) or `PERFIL:JA-EXISTE`
     (it was already there and was not touched).
  2. Ask the user for: the logo (a PNG file of up to 2 MB that is inside the project, with its
     path from the root — or none), the three lines of the header (the name of the organization;
     a second line; a third line, such as site and e-mail) and the text of the footer. Any of them
     may stay empty: what is empty does not appear in the document.
  3. Fill the file `_opencrew/_memory/documento-oficial.md` with the answers: write only the value
     after the colon of `logotipo`, `cabecalho_1`, `cabecalho_2`, `cabecalho_3` and `rodape`, each
     exactly as the user gave it. Leave every other line as it is (comments, margins, font).
     Never invent a value (a registration number, an address, a slogan), and never copy a logo
     into the project by yourself: if the file is outside the project, ask the user to put it in.
- **"Não"** — go on without the profile: the document comes out with no letterhead, with the
  standard margins and "Página X de Y" in the footer. Do not ask again in this conversation.

After this step the profile belongs to the user. Change it only when the user asks, and only the
line asked for.

## Step 3: Run the script

From the project root, one line, the path between double quotes:

`node _opencrew/core/scripts/documento.mjs "{arquivo}"`

- **`{arquivo}` was typed by the user and goes into a command** — the safe-name rule (nome seguro)
  of `_opencrew/core/runner.pipeline.md` applies: between double quotes and only if it is made of
  letters (accents included), digits, space and `. _ - / \ : ( )`. With any other character do NOT
  run the command; say
  `⚠️ O nome `{arquivo}` tem um caractere que não posso usar em comandos ({caractere}). Use só letras, números, espaço, ponto, hífen, sublinhado e parênteses.`
  and ask for the file again. The same rule holds for every path below.
- The Word goes next to the text, with the same name (`Atas/ata.md` → `Atas/ata.docx`). Only when
  the user asks for another place, the command ends with `--saida "{pasta ou arquivo.docx}"`
  (inside the project; a folder is created if it is missing).
- Only when the user asks for a document with no letterhead this time, add `--sem-perfil`; only
  when the user names another profile file, add `--perfil "{arquivo do perfil}"`.

The output of the script is the report: where the document was written, which profile was used,
the conversion warnings ("Avisos:") and two tips — "Para ter um PDF: abra o documento no Word e
use Arquivo → Salvar como → PDF." and "O Word é uma cópia do texto. O que você mudar nele não
volta sozinho: altere o texto e gere de novo.". Show it to the user as it came, without the
`DOCUMENTO:OK` line. It is fixed PT-BR, whatever the user's language: do not rewrite it.

- `DOCUMENTO:OK` → done. A warning does not change that: it says what stayed as plain text (an
  image, an unknown `:::` line, a signature block with no closing `:::`) or what was removed (an
  invalid character). Offer to fix the text and generate again; change the text only on a "sim".
- "{arquivo} já existe e está igual. Nada a fazer." is also `DOCUMENTO:OK`: nothing was written.

## Step 4: A Word that is already there

When the output is the line "Já existe {arquivo}, diferente do que eu ia gravar. Para trocar, rode
de novo com --substituir.", nothing was written: there is a different `.docx` at the destination,
and the user may have edited it in Word. Ask before replacing it, and wait:

```
Já existe {arquivo}, diferente do que eu ia gravar. Posso substituir? O que foi mudado direto no Word se perde. (sim / não)
```

- "Sim" → the same command again, ending with `--substituir`.
- "Não" → nothing is replaced. Offer another name or folder (`--saida`, Step 3).

The first call never has `--substituir`, and a "sim" is worth for that file and that call only.

## Step 5: When the command fails

The command failed when there is no Node, an error, or no `DOCUMENTO:` line at the end (it prints
one message in PT-BR and stops, with nothing written). Show the message to the user as it came.

- **The message points to something in the command you wrote** (an option, a path, more than one
  file): fix the command and run it once more.
- **The message starts with "Perfil, linha {n}:"** (an unknown key, a value out of range, a logo
  that is missing, is not a PNG or is over 2 MB): the document is not generated with a wrong
  letterhead. Show the message, ask the user for the right value of that line, write it in the
  profile and run again. Do not switch to `--sem-perfil` by yourself.
- **"Não consegui gravar {arquivo}. …"**: the file is open in Word or the folder is syncing. Ask
  the user to close it and run the same command again.
- **Anything else**, or the command did not run at all:

  ```
  ⚠️ A conversão para Word não rodou: {motivo}. O texto continua em {arquivo}.
  ```

  `{motivo}` is the message the script printed (without its final period), or what kept it from
  running. Stop there.

Never generate the document by any other means: no other script, no library, no Word or office
automation, no HTML or RTF saved with another extension. A document made another way would not
have the same guarantees (the same words, the letterhead of the profile), and the user would not
know.

## Rules

- **DO** show the report of the script as it came.
- **DO** ask before `--substituir`, every time.
- **DO NOT** generate the `.docx` by any other means, even when the script fails.
- **DO NOT** edit the user's text to remove a warning without a "sim".
- **DO NOT** write in `_opencrew/_memory/documento-oficial.md` anything the user did not give you.
- **DO NOT** promise how the document looks in Word: you did not open it. The user checks the
  header, the pages, the tables and the signatures in Word.
