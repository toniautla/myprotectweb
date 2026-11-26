import { Box, Button, Flex, Heading, Text } from "@chakra-ui/react"
import { getSession, signIn } from "next-auth/react"
import { FaDiscord } from "react-icons/fa"
import { useState } from "react"
import BaseLayout from "../components/BaseLayout"

export default function SignIn() {
    const [isLoading, setLoading] = useState(false)

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
                    <Text color="gray.400" mb={8}>
                        Log in with Discord to manage your servers with MyProtect.
                    </Text>
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
                            signIn("discord", { callbackUrl: "/dashboard" })
                        }}
                    >
                        Login with Discord
                    </Button>
                </Box>
            </Flex>
        </BaseLayout>
    )
}

export async function getServerSideProps(context) {
    const session = await getSession(context)
    if (session) {
        return { redirect: { destination: "/dashboard", permanent: false } }
    }
    return { props: {} }
}
