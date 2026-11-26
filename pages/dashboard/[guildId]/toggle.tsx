import { Flex, Heading, Icon, Switch, Text, useToast } from "@chakra-ui/react"
import { useState } from "react"
import BaseLayout from "../../../components/BaseLayout"
import InviteScreen from "../../../components/InviteScreen"
import { loadGuildContext } from "../../../lib/guildProps"
import { Modules } from "../../../lib/Modules"
import { FaCheck, FaChessRook, FaDatabase, FaFish, FaHammer, FaHandPaper, FaMailBulk } from "react-icons/fa"
import api from "../../../lib/api"

const MODULES = [
    { module: "Moderation", name: "Moderation", icon: FaHammer },
    { module: "Rules", name: "Rules", icon: FaCheck },
    { module: "Backups", name: "Backups", icon: FaDatabase },
    { module: "AntiRaid", name: "Anti Raid", icon: FaHandPaper },
    { module: "AntiPhishing", name: "Anti Phishing", icon: FaFish },
    { module: "Webhooks", name: "Webhook Protection", icon: FaChessRook },
    { module: "ContentProtect", name: "Special Channels", icon: FaMailBulk },
]

function ModuleBox({ guildId, module, name, icon, initial }) {
    const [status, setStatus] = useState<boolean>(initial)
    const [busy, setBusy] = useState(false)
    const toast = useToast({ isClosable: true, variant: "solid", position: "bottom-right" })

    return (
        <Flex
            p={6}
            bg="gray.800"
            rounded="xl"
            w={{ base: "100%", sm: "280px" }}
            position="relative"
            overflow="hidden"
            direction="column"
            border="1px solid"
            borderColor="whiteAlpha.100"
        >
            <Icon as={icon} position="absolute" fontSize="7rem" top="-20px" right="-10px" opacity={0.08} />
            <Flex alignItems="center" justifyContent="space-between" gap={3}>
                <Text fontSize="xl" fontWeight="semibold">
                    {name}
                </Text>
                <Switch
                    size="lg"
                    isChecked={status}
                    isDisabled={busy}
                    colorScheme="green"
                    onChange={async () => {
                        setBusy(true)
                        const previous = status
                        try {
                            const res = await api("/modules/toggle", "POST", { guild: guildId, module })
                            setStatus(res.status)
                        } catch (e: any) {
                            setStatus(previous)
                            toast({ status: "error", title: "Failed", description: e.message })
                        } finally {
                            setBusy(false)
                        }
                    }}
                />
            </Flex>
        </Flex>
    )
}

export default function TogglePage({ guild, moduleSettings }) {
    if (!guild) return <InviteScreen />

    const isEnabled = (module: string) =>
        module in moduleSettings ? moduleSettings[module].enabled !== false : true

    return (
        <BaseLayout pageTitle={guild.name} navGuild={guild}>
            <Flex direction="column" alignItems="center" px={6} mb={6}>
                <Heading fontSize={{ base: "2xl", md: "3xl" }}>Toggle Modules</Heading>
                <Text color="gray.400" mt={1}>
                    Turn MyProtect features on or off for {guild.name}.
                </Text>
            </Flex>
            <Flex p={5} justifyContent="center" gap={6} wrap="wrap" maxW="1100px" mx="auto">
                {MODULES.map((m) => (
                    <ModuleBox key={m.module} guildId={guild._id} {...m} initial={isEnabled(m.module)} />
                ))}
            </Flex>
        </BaseLayout>
    )
}

export const getServerSideProps = async (ctx) => {
    const ctxResult = await loadGuildContext(ctx)
    if ("redirect" in ctxResult) return ctxResult

    const { session, guild } = ctxResult

    let moduleSettings = {}
    if (guild) {
        moduleSettings = JSON.parse(JSON.stringify(await new Modules(guild._id).get()))
    }

    return { props: { session, guild, moduleSettings } }
}
