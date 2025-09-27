import morgan from "morgan";
import winstonLogger from "./winstonLogger";


const morganFormat=`{
    "method":":method",
    "url":":url",
    "status":":status",
    "response-time":"response-time ms"
}`

function handleMessage(message:string){
   winstonLogger.info(`Request received:${message.trim()}`)
}

const morganMiddleWare=morgan(morganFormat,{
   stream:{
    write:handleMessage
   }
})

export default morganMiddleWare;