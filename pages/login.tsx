import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react"
import { useRouter } from "next/router"
import { useState } from "react"
import { FaDiscord } from "react-icons/fa"
import BaseLayout from "../components/BaseLayout"
import { readSession } from "../lib/session"

const ERRORS: Record<string, string> = {
    state: "Login session expired or cookies were blocked. Please try again.",
    token: "Discord rejected the login. Please try again.",
    user: "Couldn't load your Discord profile. Please try again.",
}

export default function SignIn() {
    const router = useRouter()
    const [isLoading, setLoading] = useState(false)
    const error = typeof router.query.error === "string" ? ERRORS[router.query.error] : undefined

    return (
        <BaseLayout pageTitle={"Login"}>
            <Flex justifyContent="center" alignItems="center" minH="60vh" px={6}>
                <Box
                    bg="gray.900"
                    rounded="2xl"
                    p={{ base: 8, md: 12 }}
                    textAlign="center"
                    maxW="440px"
                    w="100%"
                    boxShadow="0 20px 60px rgba(0,0,0,0.45)"
                    border="1px solid"
                    borderColor="whiteAlpha.100"
                >
                    <Heading fontSize={{ base: "2xl", md: "3xl" }} mb={3}>
                        Welcome back
                    </Heading>
                    <Text color="gray.400" mb={error ? 4 : 8}>
                        Log in with Discord to manage your servers with MyProtect.
                    </Text>
                    {error && (
                        <Text color="red.300" mb={6} fontSize="sm">
                            {error}
                        </Text>
                    )}
                    <Button
                        w="100%"
                        size="lg"
                        color="white"
                        bg="#5966f2"
                        _hover={{ bg: "#2c3bed" }}
                        leftIcon={<FaDiscord />}
                        isLoading={isLoading}
                        loadingText="Redirecting to Discord..."
                        onClick={() => {
                            setLoading(true)
                            window.location.href = "/api/auth/login"
                        }}
                    >
                        Login with Discord
                    </Button>
                </Box>
            </Flex>
        </BaseLayout>
    )
}

export async function getServerSideProps(ctx) {
    if (readSession(ctx.req)) {
        return { redirect: { destination: "/dashboard", permanent: false } }
    }
    return { props: {} }
}
