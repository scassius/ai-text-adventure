import { useEffect, useState } from 'react'
import './App.css'
import OpenAI from "openai";

function App() {

  //TODO: Orario, Karma, Vita, Caps, Eventi Casuali, Mappa, Survivng Chance

  const [text, setText] = useState("")
  const [imageUrl, setImageUrl] = useState("")
  const [options, setOptions] = useState([] as string[]);
  const [audioUrl, setAudioUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pastInteractions, setPastInteractions] = useState<string[]>([]);
  const [interactionCount, setInteractionCount] = useState(0);
  const [interactions, setInteractions] = useState<{ text: string, imageUrl: string | null }[]>([]);
  const [openai, setOpenAI] = useState<OpenAI>(null);
  const [apiKey, setApiKey] = useState<string>(null);


  const requestApiKey = () => {
    const key = prompt("Please enter your OpenAI API key:");
    setApiKey(key);
  };

  const initializeOpenAI = (key) => {
    const openaiInstance = new OpenAI({
      apiKey: key,
      dangerouslyAllowBrowser: true
    });
    setOpenAI(openaiInstance);
  };

  const textToSpeech = async (text: string) => {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "onyx",
      input: text,
    });

    const url = URL.createObjectURL(await mp3.blob());
    setAudioUrl(url);
  }

  const extractOptions = (text: string): { updatedText: string, options: string[] } => {
    const lines = text.split('\n');
    let options: string[] = [];

    options = lines.filter(line => /^\d+\./.test(line)).map(option => option.replace(/^\d+\.\s*/, ''));

    let updatedText = lines.filter(line => !/^\d+\./.test(line)).join('\n');

    return { updatedText, options };
  }

  const imageGeneration = async (prompt: string) => {
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: 'standard'
    });
    const image_url = response.data[0].url;
    return image_url as string
  }

  const LoadingOverlay = () => (
    <div className="loading-overlay">
      <p>Surviving...</p>
    </div>
  );

  const generateText = async (prompt: string) => {
    let language = 'it';
    let systemMessageContent = '';
    if (language === 'en') {
      systemMessageContent = "Wasteland Navigator is a GPT for a text-based video game in a post-apocalyptic world, akin to Fallout. It narrates stories, describes locations and items, and engages in dialogues, addressing players as 'Wanderer'. The tone is mainly dark with occasional humor. It can explore a broad range of topics and scenarios, enhancing gameplay variety. Wasteland Navigator will use judgment to maintain game flow when player inputs are unclear. Additionally, it now includes the capability to generate images using DALL-E, providing visual representations of scenes or items in the game. This feature enhances the immersive experience, offering players a visual complement to the textual narrative. The response shuold not be too long. Always give 4 options (1. 2. 3. 4.)";
      // The rest of your English system message
    } else if (language === 'it') { // Example for Spanish
      systemMessageContent = "Le risposte devono essere in Italiano. Wasteland Navigator è un GPT per un videogioco testuale ambientato in un mondo post-apocalittico, simile a Fallout. Narra storie, descrive luoghi e oggetti, e si impegna in dialoghi, rivolgendosi ai giocatori come 'Wanderer'. Il tono è principalmente oscuro con occasionale umorismo. Può esplorare un'ampia gamma di argomenti e scenari, migliorando la varietà del gioco. Wasteland Navigator userà il giudizio per mantenere il flusso di gioco quando gli input dei giocatori non sono chiari. La risposta non dovrebbe essere troppo lunga. Dare sempre massimo 4 opzioni (1. 2. 3. 4.). L'utente scrvierà il contesto precendete e la sua scelta alla fine del testo, devi continuare la storia e offrire nuove opzioni.";
      // The rest of your system message in Spanish
    }

    const completion = await openai.chat.completions.create({
      messages: [
        {
          role: "system",
          content: systemMessageContent,
        },
        { role: "user", content: prompt },
      ],
      model: "gpt-4-1106-preview",
      response_format: { type: "text" },
    });
    const message = (completion.choices[0].message.content as string);

    return message
  }

  const updatePastInteractions = (newInteraction: string) => {
    setPastInteractions((prevInteractions) => {
      let updatedInteractions = [newInteraction, ...prevInteractions];
      if (updatedInteractions.length > 3) {
        updatedInteractions = updatedInteractions.slice(0, 3); // Mantieni solo le ultime 3 interazioni
      }
      return updatedInteractions;
    });
  }

  const changeImage = async (newImageUrl: string) => {
    const imageElement = (document.querySelector('.image-container img') as Element);
    imageElement.classList.add('blur');


    setTimeout(() => {
      setImageUrl(newImageUrl);
      imageElement.classList.remove('blur');
    }, 1000);
  }


  const main = async (option: string) => {
    setIsLoading(true); // Start loading

    try {
      const userOption: string = option ? `User chooses: ${option}.` : "Start Adventure";
      const pastContext = pastInteractions.join(' '); // Unisci le interazioni passate
      const prompt = `${pastContext} ${userOption} Continue the story:`;

      const textGenerated = await generateText(prompt);
      const { updatedText, options } = extractOptions(textGenerated);

      setText(updatedText);
      setOptions(options);
      textToSpeech(updatedText);
      updatePastInteractions(`${updatedText} ${userOption}`);
      //const dallePrompt = await generateDallePrompt(textGenerated);

      setInteractionCount(prevCount => prevCount + 1);
      if (interactionCount % 3 === 0 || interactionCount == 0) {
        const imageUrlGenerated = await imageGeneration("Post-apocalyptic landscape featuring desolate scenery, ruined buildings, and an atmosphere of decay. videogame style, fallout," + updatedText);
        //setImageUrl(imageUrlGenerated);
        changeImage(imageUrlGenerated);

        setInteractions(prevInteractions => [...prevInteractions, {
          imageUrl: imageUrlGenerated,
          text: `${updatedText} ${userOption}`
        }]);
      } else {
        setInteractions(prevInteractions => [...prevInteractions, {
          imageUrl: null,
          text: `${updatedText} ${userOption}`
        }]);
      }
    } catch (error) {
      console.error("Error during generation:", error);
    } finally {
      setIsLoading(false); // Stop loading after all operations are complete
    }
  }

  const downloadHTML = async () => {
    const htmlContent = await generateHTMLContentBook();
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'WastelandChronicles.html';
    document.body.appendChild(link); // Aggiungi il link al DOM
    link.click(); // Simula il click per scaricare
    document.body.removeChild(link); // Rimuovi il link dal DOM
  }

  const generateHTMLContentBook = async () => {
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Wasteland Chronicles</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          color: #333;
          line-height: 1.6;
          padding: 20px;
        }
        .image-container {
          text-align: center;
          margin: 20px 0;
        }
        img {
          max-width: 100%;
          height: auto;
        }
        h1 {
          text-align: center;
          color: #4a4a4a;
        }
        h2 {
          color: #6a6a6a;
        }
      </style>
    </head>
    <body>
      <h1>Wasteland Chronicles</h1>`;

    interactions.forEach(async (interaction, index) => {
      //const base64Image = interaction.imageUrl ? await convertImageToBase64(interaction.imageUrl) : null;
      htmlContent += `
      <div>
        <h2>Interazione ${index + 1}</h2>
        <p>${interaction.text}</p>
        <div class="image-container"><img src="${interaction.imageUrl}" alt="Immagine del Wasteland"></div>
      </div>`;
    });

    htmlContent += `</body></html>`;
    return htmlContent;
  }

  useEffect(() => {
    if (apiKey === null) {
      requestApiKey();
    }
  }, [apiKey]);

  useEffect(() => {
    if (apiKey) {
      initializeOpenAI(apiKey);
    }
  }, [apiKey]);
  

  useEffect(() => {
    if (openai) {
      main("Start Adventure");
    }
  }, [openai]);

  return (
    <>
      {isLoading && <LoadingOverlay />}
      <div className="image-container">
        <img src={imageUrl} alt="Wasteland Image" />
      </div>
      <div style={{
        position: 'fixed',
        top: '0',
        right: '0',
        margin: '20px'
      }}>
        <button onClick={downloadHTML}>Download Story</button>
      </div>
      <div>
        <div>
          <h1>Wasteland Chronicles</h1>
          {/*<button onClick={() => main(option)}>generate text</button>*/}
          <h4 style={{
            backgroundColor: '#1a1a1acb',
            padding: '5px',
            borderRadius: '3px'
          }}>{text}</h4>

          {options.map((option, index) => (
            <button style={{ margin: '10px' }} onClick={() => main(option)} key={index}>{option}</button>
          ))}
        </div>
        {audioUrl && <audio src={audioUrl} autoPlay />}
      </div>
    </>
  )
}

export default App
