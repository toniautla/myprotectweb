import {
    Box,
    Button,
    Divider,
    Flex,
    FormLabel,
    Grid,
    IconButton,
    Image,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Text,
    useToast,
} from "@chakra-ui/react"
import { useState } from "react"
import { FaPlus, FaTrash } from "react-icons/fa"
import { v4 as makeId } from "uuid"
import Select from "react-select"
import api from "../../lib/api"
import SelectStyle from "../../styles/selectStyle"

const isUrl = (v: string) => {
    if (!v) return false
    try {
        const u = new URL(v)
        return u.protocol === "http:" || u.protocol === "https:"
    } catch {
        return false
    }
}

// ── Live Discord-style embed preview ─────────────────────────────────────
function EmbedPreview({ title, description, authorName, authorIcon, imageUrl, color, rules, buttons }) {
    const validRules = rules.filter((r) => r.title && r.description)
    const validButtons = buttons.filter((b) => b.label && isUrl(b.link))

    return (
        <Box bg="#313338" rounded="md" p={3} w="100%">
            <Text fontSize="xs" color="gray.400" mb={2}>
                Preview
            </Text>
            <Flex bg="#2b2d31" rounded="4px" overflow="hidden">
                <Box w="4px" bg={`#${color || "5865f2"}`} flexShrink={0} />
                <Box p={4} w="100%">
                    {authorName && (
                        <Flex align="center" gap={2} mb={2}>
                            {isUrl(authorIcon) && (
                                <Image src={authorIcon} alt="" boxSize="24px" rounded="full" />
                            )}
                            <Text fontSize="sm" fontWeight="semibold" color="white">
                                {authorName}
                            </Text>
                        </Flex>
                    )}
                    {title && (
                        <Text fontWeight="bold" color="white" fontSize="md" mb={1}>
                            {title}
                        </Text>
                    )}
                    {description && (
                        <Text color="#dbdee1" fontSize="sm" whiteSpace="pre-wrap" mb={2}>
                            {description}
                        </Text>
                    )}
                    {validRules.map((r, i) => (
                        <Box key={i} mb={2}>
                            <Text color="white" fontWeight="semibold" fontSize="sm">
                                {i + 1}. {r.title}
                            </Text>
                            <Text color="#dbdee1" fontSize="sm" whiteSpace="pre-wrap">
                                {r.description}
                            </Text>
                        </Box>
                    ))}
                    {isUrl(imageUrl) && <Image src={imageUrl} alt="" rounded="md" mt={2} maxH="160px" />}
                    {validButtons.length > 0 && (
                        <Flex gap={2} mt={3} wrap="wrap">
                            {validButtons.map((b, i) => (
                                <Box key={i} bg="#4e5058" color="white" fontSize="xs" fontWeight="semibold" px={3} py={2} rounded="4px">
                                    🔗 {b.label}
                                </Box>
                            ))}
                        </Flex>
                    )}
                    {!title && !description && validRules.length === 0 && (
                        <Text color="gray.500" fontSize="sm">
                            Start typing to see your rules embed here.
                        </Text>
                    )}
                </Box>
            </Flex>
        </Box>
    )
}

export default function RuleModal({ onClose, isOpen, doc, guild }) {
    const toast = useToast({ isClosable: true, variant: "solid", position: "bottom-right" })

    const defaultRule = () => ({ title: "", description: "", id: makeId() })
    const defaultButton = () => ({ label: "", link: "", id: makeId() })

    const [title, setTitle] = useState(doc.title || "")
    const [description, setDescription] = useState(doc.description || "")
    const [authorName, setAuthorName] = useState(doc.authorName || "")
    const [authorIcon, setAuthorIcon] = useState(doc.authorIcon || "")
    const [imageUrl, setImageUrl] = useState(doc.imageUrl || "")
    const [color, setColor] = useState(doc.color || "5865f2")
    const [rules, setRules] = useState(
        (doc.rules || []).length ? doc.rules.map((r) => ({ ...r, id: makeId() })) : [defaultRule()]
    )
    const [buttons, setButtons] = useState(
        (doc.buttons || []).length ? doc.buttons.map((b) => ({ ...b, id: makeId() })) : [defaultButton()]
    )
    const [channelId, setChannelId] = useState<string>("")
    const [saving, setSaving] = useState(false)
    const [posting, setPosting] = useState(false)

    const channelOptions = (guild.channels || [])
        .filter((c) => c.type === "text")
        .map((c) => ({ label: `#${c.name}`, value: c.id }))

    const updateRow = (list, setList, index, key, value) => {
        const next = [...list]
        next[index] = { ...next[index], [key]: value }
        setList(next)
    }
    const removeRow = (list, setList, index) => setList(list.filter((_, i) => i !== index))

    const buildPayload = () => {
        if (authorIcon && !isUrl(authorIcon)) throw new Error("Author icon must be a valid URL.")
        if (imageUrl && !isUrl(imageUrl)) throw new Error("Image must be a valid URL.")
        return {
            guild: guild._id,
            collection: "rules",
            title,
            description,
            authorName,
            authorIcon,
            imageUrl,
            color,
            rules: rules.map((r) => ({ title: r.title, description: r.description })).filter((r) => r.title && r.description),
            buttons: buttons.map((b) => ({ label: b.label, link: b.link })).filter((b) => b.label && isUrl(b.link)),
        }
    }

    const save = async () => {
        setSaving(true)
        try {
            await api("/update_doc", "POST", buildPayload())
            toast({ status: "success", title: "Rules saved" })
            onClose()
        } catch (e: any) {
            toast({ status: "error", title: "Couldn't save", description: e.message })
        } finally {
            setSaving(false)
        }
    }

    const publish = async () => {
        if (!channelId) return toast({ status: "error", title: "Pick a channel to publish to." })
        setPosting(true)
        try {
            await api("/update_doc", "POST", buildPayload())
            await api("/jobs/create", "POST", { guild: guild._id, type: "postRules", channelId })
            toast({ status: "success", title: "Publishing", description: "The bot will post your rules within a few seconds." })
        } catch (e: any) {
            toast({ status: "error", title: "Couldn't publish", description: e.message })
        } finally {
            setPosting(false)
        }
    }

    return (
        <Modal size="4xl" onClose={onClose} isOpen={isOpen} scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent bg="gray.900">
                <ModalHeader>
                    Manage: Rules
                    <ModalCloseButton />
                </ModalHeader>
                <ModalBody>
                    <Grid templateColumns={{ base: "1fr", lg: "1fr 1fr" }} gap={6}>
                        {/* Editor */}
                        <Flex direction="column" gap={4}>
                            <Box>
                                <FormLabel>Title</FormLabel>
                                <Input placeholder="Server Rules" value={title} onChange={(e) => setTitle(e.target.value)} />
                            </Box>
                            <Box>
                                <FormLabel>Description</FormLabel>
                                <Input placeholder="Please follow these rules…" value={description} onChange={(e) => setDescription(e.target.value)} />
                            </Box>
                            <Flex gap={3}>
                                <Box flex={1}>
                                    <FormLabel>Author Name</FormLabel>
                                    <Input placeholder="Optional" value={authorName} onChange={(e) => setAuthorName(e.target.value)} />
                                </Box>
                                <Box>
                                    <FormLabel>Color</FormLabel>
                                    <Input type="color" p={1} value={`#${color || "5865f2"}`} onChange={(e) => setColor(e.target.value.replace("#", ""))} />
                                </Box>
                            </Flex>
                            <Box>
                                <FormLabel>Author Icon URL</FormLabel>
                                <Input placeholder="https://…" value={authorIcon} onChange={(e) => setAuthorIcon(e.target.value)} />
                            </Box>
                            <Box>
                                <FormLabel>Image URL</FormLabel>
                                <Input placeholder="https://…" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                            </Box>

                            <Divider />

                            <Box>
                                <Flex justify="space-between" align="center" mb={2}>
                                    <FormLabel m={0}>Rules</FormLabel>
                                    <IconButton aria-label="Add rule" icon={<FaPlus />} size="xs" onClick={() => setRules([...rules, defaultRule()])} />
                                </Flex>
                                <Flex direction="column" gap={2}>
                                    {rules.map((rule, index) => (
                                        <Flex key={rule.id} gap={2}>
                                            <Input placeholder="Title" maxW="160px" value={rule.title} onChange={(e) => updateRow(rules, setRules, index, "title", e.target.value)} />
                                            <Input placeholder="Rule text" value={rule.description} onChange={(e) => updateRow(rules, setRules, index, "description", e.target.value)} />
                                            <IconButton aria-label="Remove" icon={<FaTrash />} size="sm" variant="ghost" colorScheme="red" onClick={() => removeRow(rules, setRules, index)} />
                                        </Flex>
                                    ))}
                                </Flex>
                            </Box>

                            <Box>
                                <Flex justify="space-between" align="center" mb={2}>
                                    <FormLabel m={0}>Link Buttons</FormLabel>
                                    <IconButton aria-label="Add button" icon={<FaPlus />} size="xs" onClick={() => setButtons([...buttons, defaultButton()])} />
                                </Flex>
                                <Flex direction="column" gap={2}>
                                    {buttons.map((button, index) => (
                                        <Flex key={button.id} gap={2}>
                                            <Input placeholder="Label" maxW="160px" value={button.label} onChange={(e) => updateRow(buttons, setButtons, index, "label", e.target.value)} />
                                            <Input placeholder="https://…" value={button.link} onChange={(e) => updateRow(buttons, setButtons, index, "link", e.target.value)} />
                                            <IconButton aria-label="Remove" icon={<FaTrash />} size="sm" variant="ghost" colorScheme="red" onClick={() => removeRow(buttons, setButtons, index)} />
                                        </Flex>
                                    ))}
                                </Flex>
                            </Box>
                        </Flex>

                        {/* Live preview + publish */}
                        <Flex direction="column" gap={4} position={{ lg: "sticky" }} top={0} alignSelf="start">
                            <EmbedPreview
                                title={title}
                                description={description}
                                authorName={authorName}
                                authorIcon={authorIcon}
                                imageUrl={imageUrl}
                                color={color}
                                rules={rules}
                                buttons={buttons}
                            />
                            <Box>
                                <FormLabel>Publish to channel</FormLabel>
                                <Select
                                    styles={SelectStyle}
                                    options={channelOptions}
                                    value={channelOptions.find((o) => o.value === channelId) || null}
                                    onChange={(o: any) => setChannelId(o?.value || "")}
                                    placeholder="Select a channel…"
                                />
                                <Button mt={3} w="100%" colorScheme="brand.blue" onClick={publish} isLoading={posting} isDisabled={!channelId}>
                                    Publish to Discord
                                </Button>
                                <Text fontSize="xs" color="gray.500" mt={2}>
                                    The bot posts it within a few seconds. Requires the bot to be online.
                                </Text>
                            </Box>
                        </Flex>
                    </Grid>
                </ModalBody>
                <ModalFooter>
                    <Button colorScheme="green" fontWeight="normal" onClick={save} isLoading={saving}>
                        Save
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
