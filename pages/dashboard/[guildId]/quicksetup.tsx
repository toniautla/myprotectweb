import {
    Box,
    Button,
    Divider,
    Flex,
    Heading,
    Slider,
    SliderFilledTrack,
    SliderThumb,
    SliderTrack,
    Switch,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
    useToast,
} from "@chakra-ui/react"
import { useState } from "react"
import { useRouter } from "next/router"
import BaseLayout from "../../../components/BaseLayout"
import InviteScreen from "../../../components/InviteScreen"
import { loadGuildContext } from "../../../lib/guildProps"
import api from "../../../lib/api"

const STEPS = [
    {
        module: "Moderation",
        title: "Moderation",
        description:
            "Enables ban, warn, kick and purge commands through MyProtect. Moderation commands are restricted to users with the appropriate permissions, so you can punish rule-breakers easily.",
    },
    {
        module: "Rules",
        title: "Rules",
        description:
            "Add rules for your server and present them in a clean, appealing embed — set up from both the Dashboard and the bot.",
    },
    {
        module: "Verification",
        title: "Verification",
        description:
            "Gate new members behind a verify button or a simple captcha before they can access the server.",
    },
    {
        module: "Backups",
        title: "Backups",
        description:
            "Creates and stores backups of your server every 12 hours, which you can restore in case your server gets nuked.",
    },
    {
        module: "AntiRaid",
        title: "Anti Raid",
        description: "Detects possible raids happening on your server and bans the appropriate users.",
    },
    {
        module: "AntiPhishing",
        title: "Anti Phishing",
        description: "Scans and deletes possible scam / phishing links sent by users.",
    },
    {
        module: "Webhooks",
        title: "Webhook Protection",
        description: "Deletes webhooks that have been compromised and used in unethical ways.",
    },
    {
        module: "ContentProtect",
        title: "Filtered (Special) Channels",
        description: "Restrict specific channel content to its topic (media-only, links-only, etc.).",
    },
    {
        module: "Logging",
        title: "Logging",
        description: "Send moderation actions and member joins/leaves to a log channel of your choice.",
    },
]

export default function QuickSetup({ guild }) {
    const router = useRouter()
    const toast = useToast({ status: "success", isClosable: true, variant: "solid", position: "bottom-right" })

    const [tabIndex, setTabIndex] = useState(0)
    const [enabled, setEnabled] = useState<Record<string, boolean>>({})
    const totalTabs = STEPS.length + 2 // intro + steps + finish

    if (!guild) return <InviteScreen />

    const toggleModule = async (step: (typeof STEPS)[number], value: boolean) => {
        try {
            await api("/modules/toggle", "POST", { guild: guild._id, module: step.module, status: value })
            setEnabled((e) => ({ ...e, [step.module]: value }))
            toast({
                title: value ? "Module Enabled" : "Module Disabled",
                description: `You have ${value ? "enabled" : "disabled"} ${step.title} for your server!`,
            })
        } catch (err: any) {
            toast({ status: "error", title: "Failed", description: err.message })
        }
    }

    return (
        <BaseLayout pageTitle={`Setup ${guild.name}`} navGuild={guild}>
            <Flex justifyContent="center" alignItems="center" direction="column" px={6}>
                <Heading fontSize={{ base: "2xl", md: "4xl" }} textAlign="center">
                    Setting up: {guild.name}
                </Heading>
                <Divider my={4} maxW="600px" />

                <Tabs index={tabIndex} isLazy w="100%" maxW="700px">
                    <TabPanels>
                        {/* Intro */}
                        <TabPanel>
                            <Flex direction="column" alignItems="center" gap={6}>
                                <Text fontSize="lg" textAlign="center">
                                    Welcome to MyProtect! MyProtect protects your server from mass-mention and
                                    webhook raids. Set up the dashboard for your server by completing this short
                                    guide.
                                </Text>
                                <Button colorScheme="green" onClick={() => setTabIndex(1)}>
                                    Continue
                                </Button>
                            </Flex>
                        </TabPanel>

                        {/* One panel per module */}
                        {STEPS.map((step, i) => (
                            <TabPanel key={step.module}>
                                <Flex direction="column" alignItems="center" gap={5}>
                                    <Heading fontSize="2xl">Module: {step.title}</Heading>
                                    <Text fontSize="md" textAlign="center" color="gray.300" maxW="55ch">
                                        {step.description}
                                    </Text>
                                    <Flex alignItems="center" gap={3}>
                                        <Text>Enable:</Text>
                                        <Switch
                                            size="lg"
                                            colorScheme="green"
                                            isChecked={enabled[step.module] ?? false}
                                            onChange={(e) => toggleModule(step, e.target.checked)}
                                        />
                                    </Flex>
                                    <Button colorScheme="green" onClick={() => setTabIndex(i + 2)}>
                                        Continue
                                    </Button>
                                </Flex>
                            </TabPanel>
                        ))}

                        {/* Finish */}
                        <TabPanel>
                            <Flex direction="column" alignItems="center" gap={6}>
                                <Text fontSize="lg" textAlign="center">
                                    Setup complete! Your modules have been configured. Click below to head to the
                                    dashboard.
                                </Text>
                                <Button colorScheme="blue" onClick={() => router.push(`/dashboard/${guild._id}`)}>
                                    Go to Dashboard
                                </Button>
                            </Flex>
                        </TabPanel>
                    </TabPanels>
                </Tabs>
            </Flex>

            <Box position="fixed" bottom="30px" left="20px" right="20px">
                <Slider value={tabIndex} min={0} max={totalTabs - 1} onChange={(e) => setTabIndex(e)}>
                    <SliderTrack bg="whiteAlpha.200">
                        <SliderFilledTrack bg="brand.blue.400" />
                    </SliderTrack>
                    <SliderThumb />
                </Slider>
            </Box>
        </BaseLayout>
    )
}

export const getServerSideProps = async (ctx) => {
    const ctxResult = await loadGuildContext(ctx)
    if ("redirect" in ctxResult) return ctxResult
    const { session, guild } = ctxResult
    return { props: { session, guild } }
}
