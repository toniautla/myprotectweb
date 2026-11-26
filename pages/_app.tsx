import type { AppProps } from "next/app"
import { ChakraProvider, Image } from "@chakra-ui/react"
import { Flex } from "@chakra-ui/layout"
import Router from "next/router"
import Head from "next/head"
import { useEffect, useState } from "react"
import { ThemeProvider } from "@mui/material"
import theme from "../styles/theme"
import muiTheme from "../styles/mui"

import "../styles/majorClasses.css"

function MyApp({ Component, pageProps }: AppProps) {
    const [isLoading, setLoading] = useState(false)

    // Register route-change listeners once (previously re-added on every render).
    useEffect(() => {
        const start = () => setLoading(true)
        const done = () => setLoading(false)

        Router.events.on("routeChangeStart", start)
        Router.events.on("routeChangeComplete", done)
        Router.events.on("routeChangeError", done)

        return () => {
            Router.events.off("routeChangeStart", start)
            Router.events.off("routeChangeComplete", done)
            Router.events.off("routeChangeError", done)
        }
    }, [])

    return (
        <ThemeProvider theme={muiTheme}>
            <ChakraProvider resetCSS theme={theme}>
                <Head>
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    <link
                        rel="stylesheet"
                        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap"
                    />
                </Head>
                {isLoading && (
                    <Image
                        alt="loading"
                        src="/loading.svg"
                        boxSize="50px"
                        position="fixed"
                        bottom="10px"
                        right="10px"
                        draggable={false}
                        zIndex={2000}
                    />
                )}
                <Flex flexDirection="column" minH="100vh">
                    <Component {...pageProps} />
                </Flex>
            </ChakraProvider>
        </ThemeProvider>
    )
}

export default MyApp
