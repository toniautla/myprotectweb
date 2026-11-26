import {
    Box,
    Button,
    Flex,
    FormLabel,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Select as ChakraSelect,
    Textarea,
    useToast,
} from "@chakra-ui/react"
import { useState } from "react"
import Select from "react-select"
import api from "../../lib/api"
import SelectStyle from "../../styles/selectStyle"

export default function VerificationModal({ onClose, isOpen, doc, guild }) {
    const toast = useToast({ isClosable: true, variant: "solid", position: "bottom-right" })

    const textChannels = (guild.channels || []).filter((c) => c.type === "text")
    const roles = (guild.roles || [])
        .filter((r) => r.id !== guild._id)
        .sort((a, b) => (b.position ?? 0) - (a.position ?? 0))

    const channelOptions = textChannels.map((c) => ({ label: `#${c.name}`, value: c.id }))
    const roleOptions = roles.map((r) => ({ label: `@${r.name}`, value: r.id }))

    const [roleId, setRoleId] = useState<string>(doc.roleId || "")
    const [channelId, setChannelId] = useState<string>(doc.channelId || "")
    const [mode, setMode] = useState<string>(doc.mode || "button")
    const [message, setMessage] = useState<string>(doc.message || "")
    const [saving, setSaving] = useState(false)
    const [posting, setPosting] = useState(false)

    const save = async () => {
        if (!roleId) {
            return toast({ status: "error", title: "Pick a role", description: "Choose the role members get when verified." })
        }
        setSaving(true)
        try {
            await api("/update_doc", "POST", {
                guild: guild._id,
                collection: "verification",
                roleId,
                channelId,
                mode,
                message,
            })
            toast({ status: "success", title: "Verification saved" })
            onClose()
        } catch (e: any) {
            toast({ status: "error", title: "Failed", description: e.message })
        } finally {
            setSaving(false)
        }
    }

    const postPanel = async () => {
        if (!channelId) {
            return toast({ status: "error", title: "Pick a channel", description: "Choose where to post the panel." })
        }
        setPosting(true)
        try {
            // Persist first so the posted panel uses the latest config.
            await api("/update_doc", "POST", { guild: guild._id, collection: "verification", roleId, channelId, mode, message })
            await api("/jobs/create", "POST", { guild: guild._id, type: "postVerify", channelId })
            toast({ status: "success", title: "Panel queued", description: "The bot will post it within a few seconds." })
        } catch (e: any) {
            toast({ status: "error", title: "Failed", description: e.message })
        } finally {
            setPosting(false)
        }
    }

    return (
        <Modal size="xl" onClose={onClose} isOpen={isOpen}>
            <ModalOverlay />
            <ModalContent bg="gray.900">
                <ModalHeader>
                    Manage: Verification
                    <ModalCloseButton />
                </ModalHeader>
                <ModalBody>
                    <Flex direction="column" gap={5}>
                        <Box>
                            <FormLabel>Verified Role</FormLabel>
                            <Select
                                styles={SelectStyle}
                                options={roleOptions}
                                value={roleOptions.find((o) => o.value === roleId) || null}
                                onChange={(o: any) => setRoleId(o?.value || "")}
                                placeholder="Role given after verifying…"
                            />
                        </Box>

                        <Box>
                            <FormLabel>Panel Channel</FormLabel>
                            <Select
                                styles={SelectStyle}
                                options={channelOptions}
                                value={channelOptions.find((o) => o.value === channelId) || null}
                                onChange={(o: any) => setChannelId(o?.value || "")}
                                placeholder="Channel to post the Verify panel…"
                            />
                        </Box>

                        <Box>
                            <FormLabel>Mode</FormLabel>
                            <ChakraSelect value={mode} onChange={(e) => setMode(e.target.value)}>
                                <option value="button">Button (one click)</option>
                                <option value="captcha">Captcha (solve a simple math question)</option>
                            </ChakraSelect>
                        </Box>

                        <Box>
                            <FormLabel>Panel Message</FormLabel>
                            <Textarea
                                placeholder="Click the button below to verify and gain access."
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                            />
                        </Box>
                    </Flex>
                </ModalBody>
                <ModalFooter gap={3}>
                    <Button variant="outline" onClick={postPanel} isLoading={posting}>
                        Post panel to Discord
                    </Button>
                    <Button colorScheme="green" fontWeight="normal" onClick={save} isLoading={saving}>
                        Save
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
