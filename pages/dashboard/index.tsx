import { Avatar, Flex, Heading, ScaleFade, Text, Tooltip } from "@chakra-ui/react"
import { useRouter } from "next/router"
import BaseLayout from "../../components/BaseLayout"
import { resolveSession } from "../../lib/auth"
import { GetGuildIcon } from "../../lib/Utils"

export default function DashboardIndex({ session }) {
    const router = useRouter()
    const guilds = session.guilds || []

    return (
        <BaseLayout pageTitle={"Dashboard"}>
            <Flex direction="column" alignItems="center" px={6}>
                <Avatar
                    boxSize="100px"
                    src={session.user?.image}
                    className="animate"
                    name={session.user?.name}
                />
                <Heading mt={5} className="animate" textAlign="center" fontSize={{ base: "2xl", sm: "3xl" }}>
                    {session.user?.name}, select a server!
                </Heading>
                <Text mt={2} color="gray.400" textAlign="center">
                    These are the servers you can manage with MyProtect.
                </Text>
            </Flex>

            {guilds.length === 0 ? (
                <Text mt={10} textAlign="center" color="gray.500">
                    You don&apos;t manage any servers yet.
                </Text>
            ) : (
                <Flex wrap="wrap" mt={10} px={10} pb={10} justifyContent="center">
                    {guilds.map((guild, index) => (
                        <ScaleFade key={`guild-${guild.id}`} initialScale={0.4} in={true} delay={Math.min(index / 12, 0.6)}>
                            <Tooltip label={guild.name} bg="black" fontWeight="semibold" hasArrow>
                                <Avatar
                                    cursor="pointer"
                                    className="animate"
                                    src={GetGuildIcon(guild)}
                                    name={guild.name}
                                    boxSize="80px"
                                    m={3}
                                    _hover={{ transform: "scale(1.1)" }}
                                    onClick={() => router.push(`/dashboard/${guild.id}`)}
                                />
                            </Tooltip>
                        </ScaleFade>
                    ))}
                </Flex>
            )}
        </BaseLayout>
    )
}

export const getServerSideProps = async (ctx) => {
    const session = await resolveSession(ctx.req, ctx.res)

    if (!session) {
        return { redirect: { destination: "/login", permanent: false } }
    }

    return { props: { session } }
}
